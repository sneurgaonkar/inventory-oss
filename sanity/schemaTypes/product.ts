import { defineField, defineType } from 'sanity';

export const STATUSES = [
  { title: 'Available', value: 'available' },
  { title: 'Reserved', value: 'reserved' },
  { title: 'Sold', value: 'sold' },
  { title: 'Given away', value: 'given' },
] as const;

export const product = defineType({
  name: 'product',
  title: 'Item',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (r) => r.min(1),
    }),
    defineField({
      name: 'videos',
      title: 'Videos',
      description: 'Optional. Shown in the gallery after the photos. Use a web-friendly MP4 (H.264/AAC), ideally under 10 MB.',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'productVideo',
          title: 'Video',
          fields: [
            defineField({
              name: 'file',
              type: 'file',
              options: { accept: 'video/mp4,video/webm' },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'poster', title: 'Poster frame', type: 'image' }),
          ],
          preview: { select: { media: 'poster', title: 'file.asset.originalFilename' } },
        },
      ],
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 10,
      description: 'Markdown: blank line between paragraphs, "- " for bullet points, **bold**, *italic*.',
    }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'condition',
      type: 'string',
      options: {
        list: ['Unopened (sealed)', 'Like new', 'Good', 'Fair', 'Needs repair'],
        layout: 'radio',
      },
    }),
    defineField({ name: 'purchaseDate', title: 'Purchased on', type: 'date' }),
    defineField({
      name: 'purchasePrice',
      title: 'Purchase price',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'askingPrice',
      title: 'Asking price',
      description: 'Set to 0 to give away for free',
      type: 'number',
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: 'status',
      type: 'string',
      initialValue: 'available',
      options: { list: [...STATUSES], layout: 'radio' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({
      name: 'hidden',
      title: 'Hide from site',
      type: 'boolean',
      initialValue: false,
      description: 'Keep this item in the CMS but don\u2019t show it on the website yet',
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Original listing URL',
      type: 'url',
      description: 'Link to where you bought it (Amazon, Wakefit…)',
    }),
  ],
  preview: {
    select: { title: 'title', media: 'images.0', status: 'status', price: 'askingPrice', hidden: 'hidden' },
    prepare({ title, media, status, price, hidden }) {
      const priceLabel = price === 0 ? 'Free' : String(price?.toLocaleString('en-IN') ?? '');
      return { title, media, subtitle: `${priceLabel} · ${status}${hidden ? ' · HIDDEN' : ''}` };
    },
  },
});
