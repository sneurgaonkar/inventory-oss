import { sanityClient } from 'sanity:client';
import { defineQuery } from 'groq';
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url';
import { siteConfig } from '../../site.config';
import { SAMPLE_CATEGORIES, SAMPLE_PRODUCTS, SAMPLE_SETTINGS } from './sample-data';

/** Local image placeholder used by sample data (no Sanity asset). */
export type LocalImage = { _type: 'local'; url: string };
export type ProductImage = SanityImageSource | LocalImage;

const hasSanity = Boolean(import.meta.env.PUBLIC_SANITY_PROJECT_ID);
const builder = hasSanity ? createImageUrlBuilder(sanityClient) : null;

export const urlFor = (source: SanityImageSource) => {
  if (!builder) throw new Error('Sanity is not configured');
  return builder.image(source).auto('format');
};

const isLocal = (source: ProductImage): source is LocalImage =>
  !!source && typeof source === 'object' && (source as LocalImage)._type === 'local';

/** Image fitted inside a w×w box (never cropped or upscaled). */
export const imgBox = (source: ProductImage, w: number) => {
  if (isLocal(source)) return source.url;
  return urlFor(source).maxWidth(w).maxHeight(w).quality(82).url();
};

/** `srcset` string for a square box at several widths. */
export const srcsetBox = (source: ProductImage, widths: number[]) => {
  if (isLocal(source)) return `${source.url} ${widths[0] ?? 480}w`;
  return widths.map((w) => `${imgBox(source, w)} ${w}w`).join(', ');
};

const PRODUCT_FIELDS = `
  _id, _createdAt, title, "slug": slug.current, images, description, condition,
  "videos": videos[defined(file.asset)]{ _key, "url": file.asset->url, "mimeType": file.asset->mimeType, poster },
  purchaseDate, purchasePrice, askingPrice, status, featured, sourceUrl,
  "category": category->{ title, "slug": slug.current }
`;

export type Product = {
  _id: string;
  _createdAt: string;
  title: string;
  slug: string;
  images: ProductImage[];
  videos?: ProductVideo[] | null;
  description?: string;
  condition?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  askingPrice: number;
  status: 'available' | 'reserved' | 'sold' | 'given';
  featured?: boolean;
  sourceUrl?: string;
  category: { title: string; slug: string };
};

export type ProductVideo = { _key: string; url: string; mimeType?: string; poster?: ProductImage | null };

export type Category = { title: string; slug: string };

export type SiteSettings = { headline: string; pickupNote: string };
export const DEFAULT_SETTINGS: SiteSettings = {
  headline: siteConfig.headline,
  pickupNote: siteConfig.pickupNote,
};

const sym = siteConfig.currencySymbol;

/** Price filter tiers (by asking price). `max` is exclusive. Edit in site.config.ts. */
export const PRICE_TIERS = [
  { id: 'free', label: 'Free', min: 0, max: 1 },
  { id: 'under-1k', label: `Under ${sym}1,000`, min: 1, max: 1000 },
  { id: '1k-5k', label: `${sym}1,000 – ${sym}5,000`, min: 1000, max: 5000 },
  { id: '5k-15k', label: `${sym}5,000 – ${sym}15,000`, min: 5000, max: 15000 },
  { id: '15k-plus', label: `${sym}15,000+`, min: 15000, max: Infinity },
] as const;

export const SORTS = [
  { id: 'popular', label: 'Most popular' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'price-asc', label: 'Price: low to high' },
] as const;

/** Listings per page on the homepage. */
export const PAGE_SIZE = 20;

const PRODUCTS_QUERY = defineQuery(
  `*[_type == "product" && defined(slug.current) && hidden != true] | order(featured desc, status asc, _createdAt desc) { ${PRODUCT_FIELDS} }`
);
const PRODUCT_QUERY = defineQuery(
  `*[_type == "product" && slug.current == $slug && hidden != true][0] { ${PRODUCT_FIELDS} }`
);
const CATEGORIES_QUERY = defineQuery(
  `*[_type == "category"] | order(order asc, title asc) { title, "slug": slug.current }`
);
const SITE_SETTINGS_QUERY = defineQuery(`*[_type == "siteSettings"][0] { headline, pickupNote }`);

async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasSanity) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.warn('[inventory-oss] Sanity fetch failed; using sample data.', err);
    return fallback;
  }
}

export const getProducts = () => safeFetch(() => sanityClient.fetch<Product[]>(PRODUCTS_QUERY), SAMPLE_PRODUCTS);
export const getProduct = (slug: string) =>
  safeFetch(
    () => sanityClient.fetch<Product | null>(PRODUCT_QUERY, { slug }),
    SAMPLE_PRODUCTS.find((p) => p.slug === slug) ?? null
  );
export const getCategories = () => safeFetch(() => sanityClient.fetch<Category[]>(CATEGORIES_QUERY), SAMPLE_CATEGORIES);
export const getSiteSettings = async (): Promise<SiteSettings> => {
  const s = await safeFetch(
    () => sanityClient.fetch<Partial<SiteSettings> | null>(SITE_SETTINGS_QUERY),
    SAMPLE_SETTINGS
  );
  return {
    headline: s?.headline || DEFAULT_SETTINGS.headline,
    pickupNote: s?.pickupNote || DEFAULT_SETTINGS.pickupNote,
  };
};

export const formatPrice = (n: number | undefined) =>
  n === undefined
    ? ''
    : n === 0
      ? 'Free'
      : `${siteConfig.currencySymbol}${n.toLocaleString(siteConfig.locale)}`;

export const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(siteConfig.locale, { month: 'short', year: 'numeric' }) : '';

export const STATUS_LABEL: Record<Product['status'], string> = {
  available: 'Available',
  reserved: 'On hold',
  sold: 'Sold',
  given: 'Given away',
};
