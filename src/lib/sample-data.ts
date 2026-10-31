import type { Category, Product, SiteSettings } from './sanity';
import { siteConfig } from '../../site.config';

/** Local placeholder image — used only when Sanity env vars are missing. */
const local = (path: string) => ({ _type: 'local' as const, url: path });

export const SAMPLE_SETTINGS: SiteSettings = {
  headline: siteConfig.headline,
  pickupNote: siteConfig.pickupNote,
};

export const SAMPLE_CATEGORIES: Category[] = siteConfig.categories.map(({ title, slug }) => ({ title, slug }));

export const SAMPLE_PRODUCTS: Product[] = [
  {
    _id: 'sample-desk',
    _createdAt: '2026-01-15T10:00:00.000Z',
    title: 'Solid wood writing desk',
    slug: 'solid-wood-writing-desk',
    images: [local('/sample/desk.svg')],
    description:
      'A simple writing desk with a spacious top and one drawer.\n\n**Highlights**\n- Solid wood top\n- Soft-close drawer\n- Easy to disassemble for moving\n\n**Condition**\nLike new — used as a home office desk for under a year. No scratches on the top.',
    condition: 'Like new',
    purchaseDate: '2025-03-01',
    purchasePrice: 12000,
    askingPrice: 5500,
    status: 'available',
    featured: true,
    sourceUrl: 'https://example.com/desk',
    category: { title: 'Furniture', slug: 'furniture' },
  },
  {
    _id: 'sample-chair',
    _createdAt: '2026-01-16T10:00:00.000Z',
    title: 'Mesh office chair with headrest',
    slug: 'mesh-office-chair-headrest',
    images: [local('/sample/chair.svg')],
    description:
      'Ergonomic mesh chair with lumbar support and a headrest.\n\n**Highlights**\n- Adjustable height and armrests\n- Breathable mesh back\n- Rolling base\n\n**Condition**\nGood — daily driver for about 18 months. Minor wear on the armrest pads.',
    condition: 'Good',
    purchaseDate: '2024-06-01',
    purchasePrice: 14000,
    askingPrice: 4500,
    status: 'available',
    featured: false,
    sourceUrl: 'https://example.com/chair',
    category: { title: 'Furniture', slug: 'furniture' },
  },
  {
    _id: 'sample-lamp',
    _createdAt: '2026-01-17T10:00:00.000Z',
    title: 'Adjustable desk lamp',
    slug: 'adjustable-desk-lamp',
    images: [local('/sample/lamp.svg')],
    description:
      'LED desk lamp with three brightness levels.\n\n**Highlights**\n- USB-C powered\n- Warm / cool colour temp\n- Clamp or stand mount\n\n**Condition**\nUnopened (sealed) — spare, never used.',
    condition: 'Unopened (sealed)',
    purchaseDate: '2025-11-01',
    purchasePrice: 2499,
    askingPrice: 1200,
    status: 'available',
    featured: false,
    sourceUrl: 'https://example.com/lamp',
    category: { title: 'Home essentials', slug: 'home-essentials' },
  },
  {
    _id: 'sample-book',
    _createdAt: '2026-01-18T10:00:00.000Z',
    title: 'Design of Everyday Things (paperback)',
    slug: 'design-of-everyday-things',
    images: [local('/sample/book.svg')],
    description:
      'Don Norman’s classic on product design.\n\n**Condition**\nGood — lightly read, no markings.',
    condition: 'Good',
    purchasePrice: 599,
    askingPrice: 200,
    status: 'reserved',
    featured: false,
    category: { title: 'Books', slug: 'books' },
  },
  {
    _id: 'sample-speaker',
    _createdAt: '2026-01-19T10:00:00.000Z',
    title: 'Portable Bluetooth speaker',
    slug: 'portable-bluetooth-speaker',
    images: [local('/sample/speaker.svg')],
    description:
      'Compact Bluetooth speaker with 12-hour battery.\n\n**Condition**\nSold — kept here as an example of a greyed-out sold card.',
    condition: 'Good',
    purchasePrice: 4999,
    askingPrice: 2000,
    status: 'sold',
    featured: false,
    category: { title: 'Electronics', slug: 'electronics' },
  },
];
