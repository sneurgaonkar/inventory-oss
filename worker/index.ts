// Worker API (everything else is static assets).
//   GET  /api/interest/:slug -> { count }
//   GET  /api/interest       -> { [slug]: count }    (all interest counts, for the homepage cards)
//   POST /api/interest/:slug -> { count, counted }   (one per IP per item)
//   POST /api/view/:slug     -> { counted }          (unique page views, one per IP per item; not shown publicly)
//   GET  /api/views          -> { [slug]: count }    (used only to sort the grid by "Most popular")
export interface Env { INTEREST: KVNamespace; ASSETS: Fetcher; VIEW_SALT?: string }

const SLUG = /^[a-z0-9-]{1,100}$/;
const YEAR = 60 * 60 * 24 * 365;
const VIEW_COUNTS = 'view:counts'; // aggregate JSON { slug: count }, one read for GET /api/views
const INTEREST_COUNTS = 'interest:counts'; // aggregate JSON { slug: count }, one read for GET /api/interest
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|curl|wget|python-requests|httpclient/i;

const json = (data: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const ipOf = (r: Request) => r.headers.get('cf-connecting-ip') ?? '0.0.0.0';

function isPrefetch(r: Request) {
  const p = `${r.headers.get('sec-purpose') ?? ''} ${r.headers.get('purpose') ?? ''} ${r.headers.get('x-purpose') ?? ''} ${r.headers.get('x-moz') ?? ''}`;
  return /prefetch|prerender|preview/i.test(p);
}

async function interest(request: Request, env: Env, slug: string) {
  const countKey = `count:${slug}`;
  const count = Number((await env.INTEREST.get(countKey)) ?? 0);
  if (request.method === 'GET') return json({ count });
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const seenKey = `seen:${slug}:${await sha256(`${ipOf(request)}|${slug}`)}`;
  if (await env.INTEREST.get(seenKey)) return json({ count, counted: false });
  await env.INTEREST.put(seenKey, '1');
  await env.INTEREST.put(countKey, String(count + 1));
  // Keep the aggregate in step (same race note as view counts: per-slug count is authoritative).
  const all = await interestCounts(env);
  all[slug] = count + 1;
  await env.INTEREST.put(INTEREST_COUNTS, JSON.stringify(all));
  return json({ count: count + 1, counted: true });
}

/** All interest counts. Built once from the per-slug `count:<slug>` keys if the aggregate doesn't exist yet. */
async function interestCounts(env: Env): Promise<Record<string, number>> {
  const cached = (await env.INTEREST.get(INTEREST_COUNTS, 'json')) as Record<string, number> | null;
  if (cached) return cached;
  const all: Record<string, number> = {};
  let cursor: string | undefined;
  do {
    const page = await env.INTEREST.list({ prefix: 'count:', cursor });
    await Promise.all(page.keys.map(async (k) => {
      const n = Number(await env.INTEREST.get(k.name));
      if (n > 0) all[k.name.slice('count:'.length)] = n;
    }));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  await env.INTEREST.put(INTEREST_COUNTS, JSON.stringify(all));
  return all;
}

async function view(request: Request, env: Env, slug: string, url: URL) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || BOT_UA.test(ua) || isPrefetch(request)) return json({ counted: false, reason: 'ignored' });
  // Only count real item pages (the static build has /items/<slug>/ for every listed product).
  const page = await env.ASSETS.fetch(new Request(`${url.origin}/items/${slug}/`, { method: 'HEAD' }));
  if (!page.ok) return json({ counted: false, reason: 'unknown' }, 404);

  const salt = env.VIEW_SALT ?? 'inventory-oss-views-v1';
  const seenKey = `view:seen:${await sha256(`${salt}|${ipOf(request)}|${slug}`)}`;
  if (await env.INTEREST.get(seenKey)) return json({ counted: false });
  await env.INTEREST.put(seenKey, '1', { expirationTtl: YEAR });

  const countKey = `view:count:${slug}`;
  const n = Number((await env.INTEREST.get(countKey)) ?? 0) + 1;
  await env.INTEREST.put(countKey, String(n));
  // Aggregate for GET /api/views. Read-modify-write; a lost update under a race is acceptable,
  // and is self-healing because the per-slug count is authoritative and re-written here.
  const all = ((await env.INTEREST.get(VIEW_COUNTS, 'json')) as Record<string, number> | null) ?? {};
  all[slug] = n;
  await env.INTEREST.put(VIEW_COUNTS, JSON.stringify(all));
  return json({ counted: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/views' || path === '/api/views/') {
      if (request.method !== 'GET') return json({ error: 'method' }, 405);
      const all = (await env.INTEREST.get(VIEW_COUNTS, 'json')) ?? {};
      return json(all, 200, 'public, max-age=60');
    }

    if (path === '/api/interest' || path === '/api/interest/') {
      if (request.method !== 'GET') return json({ error: 'method' }, 405);
      return json(await interestCounts(env), 200, 'public, max-age=30');
    }

    const m = path.match(/^\/api\/(interest|view)\/([^/]+)\/?$/);
    if (!m) return env.ASSETS.fetch(request);
    const [, kind, slug] = m;
    if (!SLUG.test(slug)) return json({ error: 'bad slug' }, 400);
    return kind === 'interest' ? interest(request, env, slug) : view(request, env, slug, url);
  },
} satisfies ExportedHandler<Env>;
