#!/usr/bin/env node
/**
 * Seed a fresh Sanity project with site settings, default categories,
 * and the sample products in scripts/data/sample-products.json.
 *
 *   cp .env.example .env   # fill project id + write token
 *   npm run seed
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

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

function die(m) {
  console.error('error:', m);
  process.exit(1);
}
if (!PROJECT) die('Set PUBLIC_SANITY_PROJECT_ID in .env');
if (!TOKEN) die('Set SANITY_API_WRITE_TOKEN in .env');

const API = `https://${PROJECT}.api.sanity.io/v2026-01-01`;
const H = { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };

async function mutate(mutations) {
  const r = await fetch(`${API}/data/mutate/${DATASET}?returnIds=true&visibility=sync`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ mutations }),
  });
  const j = await r.json();
  if (!r.ok) die(`mutate ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

const categories = [
  { title: 'Furniture', slug: 'furniture', order: 1 },
  { title: 'Mattresses & bedding', slug: 'mattresses', order: 2 },
  { title: 'Electronics', slug: 'electronics', order: 3 },
  { title: 'Home essentials', slug: 'home-essentials', order: 4 },
  { title: 'Books', slug: 'books', order: 5 },
];

console.log('Seeding site settings…');
await mutate([
  {
    createIfNotExists: {
      _id: 'siteSettings',
      _type: 'siteSettings',
      headline: 'Moving out — everything must go',
      pickupNote: 'Pickup only. Ask me anything via the shortlist button above.',
    },
  },
]);

console.log('Seeding categories…');
for (const c of categories) {
  await mutate([
    {
      createIfNotExists: {
        _id: `category.${c.slug}`,
        _type: 'category',
        title: c.title,
        slug: { _type: 'slug', current: c.slug },
        order: c.order,
      },
    },
  ]);
  console.log(`  ${c.title}`);
}

console.log('Seeding sample products…');
const r = spawnSync(process.execPath, ['scripts/create-item.mjs', 'scripts/data/sample-products.json'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
