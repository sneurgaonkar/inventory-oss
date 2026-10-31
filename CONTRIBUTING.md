# Contributing

Thanks for helping improve this starter.

## Ground rules

- Keep the starter **generic**. Do not add personal names, phone numbers, emails, city-specific copy, real product data, or secrets.
- Prefer configuration (`site.config.ts`, `.env`) over hard-coded branding.
- Match the existing code style (TypeScript, Astro, small focused components).

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

With `PUBLIC_SANITY_PROJECT_ID` empty, the site builds against the sample products in `src/lib/sample-data.ts`.

## Pull requests

1. Fork the repo (or create a branch if you have write access).
2. Make a focused change with a clear description.
3. Confirm `npm run build` succeeds.
4. Open a PR against `main`.

## Ideas that are especially welcome

- Better empty states
- Extra currency / locale presets
- Accessibility improvements
- Docs for alternative hosts (Vercel, Netlify, etc.)
