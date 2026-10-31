// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sanity from '@sanity/astro';
import react from '@astrojs/react';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  ''
);

// When unset, build with sample data (see src/lib/sample-data.ts). Studio needs a real project id.
const projectId = PUBLIC_SANITY_PROJECT_ID || 'placeholder';

export default defineConfig({
  // Fully static; the embedded Studio at /studio is a client-side app served as a static shell.
  output: 'static',
  integrations: [
    sanity({
      projectId,
      dataset: PUBLIC_SANITY_DATASET || 'production',
      useCdn: false,
      apiVersion: '2026-01-01',
      studioBasePath: '/studio',
    }),
    react(),
  ],
});
