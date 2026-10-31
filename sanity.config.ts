import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './sanity/schemaTypes';
import { SITE_SETTINGS_ID } from './sanity/schemaTypes/siteSettings';
import { siteConfig } from './site.config';

const SINGLETONS = new Set(['siteSettings']);

export default defineConfig({
  name: 'inventory-oss',
  title: siteConfig.siteName,
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || 'placeholder',
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.documentTypeListItem('product').title('Items'),
            S.documentTypeListItem('category').title('Categories'),
            S.divider(),
            S.listItem()
              .title('Site settings')
              .id(SITE_SETTINGS_ID)
              .child(S.document().schemaType('siteSettings').documentId(SITE_SETTINGS_ID)),
          ]),
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
  document: {
    // Singletons: no "create new" in the + menu, no duplicate/delete actions.
    newDocumentOptions: (prev, { creationContext }) =>
      creationContext.type === 'global' ? prev.filter((t) => !SINGLETONS.has(t.templateId)) : prev,
    actions: (prev, { schemaType }) =>
      SINGLETONS.has(schemaType) ? prev.filter(({ action }) => action !== 'duplicate' && action !== 'delete' && action !== 'unpublish') : prev,
  },
});
