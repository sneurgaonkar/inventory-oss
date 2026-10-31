#!/usr/bin/env node
/**
 * Create / update inventory items in Sanity from a JSON spec file.
 *
 * Usage:
 *   node scripts/create-item.mjs scripts/data/sample-products.json
 *   node scripts/create-item.mjs path/to/item.json --dry-run
 *
 * Spec is a JSON object or array. Fields: title, slug?, category, categoryTitle?,
 * categoryOrder?, description?, sourceUrl?, condition?, purchaseDate?, purchasePrice?,
 * askingPrice, featured?, status?, hidden?, images (local paths or https URLs).
 *
 * Requires SANITY_API_WRITE_TOKEN and PUBLIC_SANITY_PROJECT_ID in .env
 * (or SANITY_PROJECT_ID / SANITY_DATASET).
 */
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { basename, extname, resolve } from 'node:path';

function loadEnv() {
  if (!existsSync('.env')) return {};
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const env = { ...loadEnv(), ...process.env };
const PROJECT = env.PUBLIC_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID;
const DATASET = env.PUBLIC_SANITY_DATASET || env.SANITY_DATASET || 'production';
const TOKEN = env.SANITY_API_WRITE_TOKEN;
const CONDITIONS = ['Unopened (sealed)', 'Like new', 'Good', 'Fair', 'Needs repair'];
const STATUSES = ['available', 'reserved', 'sold', 'given'];
const SLUG_RE = /^[a-z0-9-]{1,100}$/;

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const file = args.find((a) => !a.startsWith('--'));

function die(m) {
  console.error('error:', m);
  process.exit(1);
}
if (!PROJECT) die('Set PUBLIC_SANITY_PROJECT_ID in .env');
if (!TOKEN) die('Set SANITY_API_WRITE_TOKEN in .env');
if (!file) die('Usage: node scripts/create-item.mjs <spec.json> [--dry-run]');

const API = `https://${PROJECT}.api.sanity.io/v2026-01-01`;
const H = { Authorization: `Bearer ${TOKEN}` };
const key = () => randomBytes(6).toString('hex');
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

async function query(q, params = {}) {
  const u = new URL(`${API}/data/query/${DATASET}`);
  u.searchParams.set('query', q);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(`$${k}`, JSON.stringify(v));
  const r = await fetch(u, { headers: H });
  const j = await r.json();
  if (!r.ok) die(`query ${r.status}: ${JSON.stringify(j)}`);
  return j.result;
}
async function mutate(mutations) {
  const u = `${API}/data/mutate/${DATASET}?returnIds=true&visibility=sync${DRY ? '&dryRun=true' : ''}`;
  const r = await fetch(u, {
    method: 'POST',
    headers: { ...H, 'content-type': 'application/json' },
    body: JSON.stringify({ mutations }),
  });
  const j = await r.json();
  if (!r.ok) die(`mutate ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

async function fetchImage(src) {
  if (/^https?:\/\//.test(src)) {
    const r = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*,*/*' } });
    if (!r.ok) throw new Error(`${r.status} for ${src}`);
    const type = r.headers.get('content-type') || 'application/octet-stream';
    if (!type.startsWith('image/') && !type.includes('svg')) throw new Error(`not an image (${type}): ${src}`);
    return { buf: Buffer.from(await r.arrayBuffer()), type: type.startsWith('image/') ? type : 'image/svg+xml', filename: basename(new URL(src).pathname) || 'image.jpg' };
  }
  const path = resolve(src);
  if (!existsSync(path)) throw new Error(`file not found: ${src}`);
  const ext = extname(path).slice(1).toLowerCase().replace('jpg', 'jpeg');
  const type = ext === 'svg' ? 'image/svg+xml' : `image/${ext || 'jpeg'}`;
  return { buf: readFileSync(path), type, filename: basename(path) };
}

async function uploadImage(src) {
  const { buf, type, filename } = await fetchImage(src);
  if (DRY) {
    console.log(`  [dry] image ok: ${filename} (${type}, ${(buf.length / 1024).toFixed(0)} KB)`);
    return null;
  }
  const r = await fetch(`${API}/assets/images/${DATASET}?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: { ...H, 'content-type': type },
    body: buf,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`upload ${r.status}: ${JSON.stringify(j)}`);
  console.log(`  uploaded ${filename} -> ${j.document._id}`);
  return { _type: 'image', _key: key(), asset: { _type: 'reference', _ref: j.document._id } };
}

async function ensureCategory({ slug, title, order }) {
  const existing = await query(`*[_type=="category" && slug.current==$slug][0]._id`, { slug });
  if (existing) return existing;
  if (!title) die(`category "${slug}" does not exist; pass categoryTitle to create it`);
  const doc = {
    _type: 'category',
    title,
    slug: { _type: 'slug', current: slug },
    ...(order != null ? { order: Number(order) } : {}),
  };
  const res = await mutate([{ create: doc }]);
  console.log(`${DRY ? '[dry] would create' : 'created'} category ${title} (${slug})`);
  return res.results[0].id;
}

function validate(it) {
  const errs = [];
  if (!it.title) errs.push('title required');
  it.slug ||= slugify(it.title || '');
  if (!SLUG_RE.test(it.slug)) errs.push(`bad slug "${it.slug}"`);
  if (!it.category) errs.push('category (slug) required');
  if (typeof it.askingPrice !== 'number' || it.askingPrice < 0) errs.push('askingPrice required (number >= 0)');
  if (it.purchasePrice != null && (typeof it.purchasePrice !== 'number' || it.purchasePrice < 0))
    errs.push('purchasePrice must be number >= 0');
  if (it.condition && !CONDITIONS.includes(it.condition)) errs.push(`condition must be one of ${CONDITIONS.join(', ')}`);
  if (it.status && !STATUSES.includes(it.status)) errs.push(`status must be one of ${STATUSES.join(', ')}`);
  if (it.purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(it.purchaseDate)) errs.push('purchaseDate must be YYYY-MM-DD');
  if (!Array.isArray(it.images) || it.images.length === 0) errs.push('images: at least 1 URL or path');
  if (it.sourceUrl && !/^https?:\/\//.test(it.sourceUrl)) errs.push('sourceUrl must be http(s)');
  return errs;
}

async function createProducts(path) {
  let specs = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(specs)) specs = [specs];
  for (const it of specs) {
    const errs = validate(it);
    if (errs.length) {
      console.error(`invalid "${it.title ?? '?'}": ${errs.join('; ')}`);
      continue;
    }
    if (await query(`*[_type=="product" && slug.current==$slug][0]._id`, { slug: it.slug })) {
      console.log(`skip (slug exists): ${it.slug}`);
      continue;
    }
    const catId = await ensureCategory({ slug: it.category, title: it.categoryTitle, order: it.categoryOrder });
    const images = [];
    for (const src of it.images) {
      try {
        const img = await uploadImage(src);
        if (img) images.push(img);
      } catch (e) {
        console.warn(`  image failed: ${e.message}`);
      }
    }
    if (!DRY && images.length === 0) {
      console.error(`no images uploaded for ${it.slug}; not creating`);
      continue;
    }
    const status = it.status || 'available';
    const doc = {
      _type: 'product',
      title: it.title,
      slug: { _type: 'slug', current: it.slug },
      category: { _type: 'reference', _ref: catId },
      askingPrice: it.askingPrice,
      status,
      featured: !!it.featured,
      hidden: !!it.hidden,
      images: DRY ? [] : images,
      ...(it.description ? { description: it.description } : {}),
      ...(it.condition ? { condition: it.condition } : {}),
      ...(it.purchaseDate ? { purchaseDate: it.purchaseDate } : {}),
      ...(it.purchasePrice != null ? { purchasePrice: it.purchasePrice } : {}),
      ...(it.sourceUrl ? { sourceUrl: it.sourceUrl } : {}),
    };
    const res = await mutate([{ create: doc }]);
    console.log(`${DRY ? '[dry] would create' : 'created'} ${it.slug} -> ${res.results?.[0]?.id ?? '?'}`);
  }
}

await createProducts(file);
