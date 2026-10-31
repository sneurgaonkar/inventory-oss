/**
 * Site-wide knobs. Edit these to brand your own moving / garage sale site.
 * Sanity siteSettings (headline + pickup note) can still override the copy
 * shown on the homepage after you seed them in the Studio.
 */
export const siteConfig = {
  /** Shown in the header / footer / <title> when PUBLIC_SITE_NAME is unset. */
  siteName: 'Moving sale',
  /** Default <meta name="description"> */
  description: 'Things I’m selling or giving away. Pickup only.',
  /** Default homepage headline (overridden by Sanity siteSettings). */
  headline: 'Moving out — everything must go',
  /** Default pickup note under the headline (overridden by Sanity siteSettings). */
  pickupNote: 'Pickup only. Ask me anything via the shortlist button above.',
  /** Currency symbol shown next to prices. */
  currencySymbol: '₹',
  /** BCP 47 locale used for number + date formatting. */
  locale: 'en-IN',
  /** Price filter tiers. `max` is exclusive. Adjust to your currency. */
  priceTiers: [
    { id: 'free', label: 'Free', min: 0, max: 1 },
    { id: 'under-1k', label: 'Under 1,000', min: 1, max: 1000 },
    { id: '1k-5k', label: '1,000 – 5,000', min: 1000, max: 5000 },
    { id: '5k-15k', label: '5,000 – 15,000', min: 5000, max: 15000 },
    { id: '15k-plus', label: '15,000+', min: 15000, max: Infinity },
  ],
  /** Default categories created by `npm run seed`. */
  categories: [
    { title: 'Furniture', slug: 'furniture', order: 1 },
    { title: 'Mattresses & bedding', slug: 'mattresses', order: 2 },
    { title: 'Electronics', slug: 'electronics', order: 3 },
    { title: 'Home essentials', slug: 'home-essentials', order: 4 },
    { title: 'Books', slug: 'books', order: 5 },
  ],
  /** Condition options (must match sanity/schemaTypes/product.ts). */
  conditions: ['Unopened (sealed)', 'Like new', 'Good', 'Fair', 'Needs repair'],
} as const;

export type SiteConfig = typeof siteConfig;
