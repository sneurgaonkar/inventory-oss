import { defineField, defineType } from 'sanity';

export const SITE_SETTINGS_ID = 'siteSettings';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'headline',
      title: 'Homepage headline',
      type: 'string',
      initialValue: 'Moving out — everything must go',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'pickupNote',
      title: 'Pickup note',
      description: 'Shown under the headline on the homepage',
      type: 'text',
      rows: 3,
      initialValue: 'Pickup only. Ask me anything via the shortlist button above.',
      validation: (r) => r.required(),
    }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});
