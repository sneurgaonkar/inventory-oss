# inventory-oss

An open-source **moving sale / garage sale** website.

Built with [Astro](https://astro.build) (static site), [Sanity](https://www.sanity.io) (CMS), and [Cloudflare Workers](https://workers.cloudflare.com) (hosting + interest / view counters). Everything runs on free tiers.

> **Screenshot:** after you deploy, drop homepage and item-page shots into [`docs/screenshots/`](docs/screenshots/) and link them here.

## Features

- Category filters with small line icons
- Condition tags on cards (including sealed / unopened)
- **Available**, **On hold** (reserved), and **Sold** (greyed) sections
- Featured items sort first; optional **Most popular** sort from unique visitor counts in Cloudflare KV
- Price and category filters, header counts
- Image + optional video galleries
- Markdown descriptions (bold, lists)
- Asking price with purchase price struck through
- Link back to the original store listing
- Shortlist drawer that emails you via [Web3Forms](https://web3forms.com)
- Embedded Sanity Studio at `/studio`

## Quick start (sample data, no Sanity yet)

```bash
git clone https://github.com/sneurgaonkar/inventory-oss.git
cd inventory-oss
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:4321 — you’ll see five sample products. Edit branding in [`site.config.ts`](site.config.ts).

## Full setup

### 1. Create a Sanity project

```bash
npx sanity@latest init --bare
```

Or create one at [sanity.io/manage](https://www.sanity.io/manage). Copy the project ID.

### 2. Configure env vars

```bash
cp .env.example .env
```

Fill in:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SANITY_PROJECT_ID` | Your Sanity project id |
| `PUBLIC_SANITY_DATASET` | Usually `production` |
| `PUBLIC_WEB3FORMS_KEY` | Free key from [web3forms.com](https://web3forms.com) (shortlist form) |
| `PUBLIC_SITE_NAME` | Optional override of `site.config.ts` |
| `SANITY_API_WRITE_TOKEN` | Editor token for `npm run seed` / `create-item` |

In Sanity → API → CORS origins, add `http://localhost:4321` and your deployed URL (credentials allowed).

### 3. Seed categories + sample products

```bash
npm run seed
```

Or add items by hand in the Studio at http://localhost:4321/studio.

### 4. Brand the site

Edit [`site.config.ts`](site.config.ts) for site name, description, currency symbol, locale, price tiers, and default categories. Homepage headline / pickup note can also be edited in Studio → Site settings.

### 5. Deploy to Cloudflare Workers

1. Create a KV namespace for interest / view counts:

   ```bash
   npx wrangler kv namespace create INTEREST
   ```

2. Paste the id into [`wrangler.jsonc`](wrangler.jsonc) (replace `YOUR_KV_NAMESPACE_ID`).

3. Set the same `PUBLIC_*` variables as Cloudflare Worker build secrets / vars.

4. Deploy:

   ```bash
   npm run deploy
   ```

5. Add the deployed URL to Sanity CORS origins.

6. Optional: Cloudflare Deploy Hook + Sanity webhook so edits (sold, new photos) rebuild the site automatically. Price and status also refresh live from Sanity’s API CDN without a rebuild.

Local preview of the Worker APIs:

```bash
npm run preview:cf
```

## Adding products

**Studio** — open `/studio`, create categories, then items (photos, prices, condition, status).

**CLI** — write a JSON spec and run:

```bash
npm run create-item -- path/to/item.json
```

See [`scripts/data/sample-products.json`](scripts/data/sample-products.json) for the shape. Dry-run with `--dry-run`.

## Project layout

```
site.config.ts          # branding, currency, categories
src/pages/              # homepage + item pages
src/components/         # cards, shortlist, interest button
src/lib/                # Sanity client, markdown, sample data
sanity/schemaTypes/     # product, category, siteSettings
scripts/                # seed + create-item helpers
worker/                 # Cloudflare Worker (/api/interest, /api/view)
public/sample/          # SVG placeholders for sample mode
```

## License

MIT — see [LICENSE](LICENSE).
