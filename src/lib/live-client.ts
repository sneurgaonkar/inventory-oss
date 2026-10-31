// Browser-side: fetch just price + status straight from Sanity's API CDN,
// so those stay fresh between site rebuilds.
import { siteConfig } from '../../site.config';

const PROJECT = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const DATASET = import.meta.env.PUBLIC_SANITY_DATASET || 'production';

export type LiveInfo = { slug: string; status: 'available' | 'reserved' | 'sold' | 'given'; askingPrice: number; hidden?: boolean };

export const fmt = (n: number) =>
  n === 0 ? 'Free' : `${siteConfig.currencySymbol}${n.toLocaleString(siteConfig.locale)}`;
export const STATUS_LABEL: Record<LiveInfo['status'], string> = {
  available: 'Available', reserved: 'On hold', sold: 'Sold', given: 'Given away',
};

export async function fetchLive(): Promise<LiveInfo[]> {
  if (!PROJECT) return [];
  const query = `*[_type=="product" && defined(slug.current)]{"slug":slug.current,status,askingPrice,hidden}`;
  const url = `https://${PROJECT}.apicdn.sanity.io/v2026-01-01/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sanity ${res.status}`);
  return ((await res.json()) as { result: LiveInfo[] }).result;
}

/** Update a listing card (needs data-slug, [data-asking], [data-badge]).
 *  Sets data-hidden; the page decides final visibility (filters + pagination). */
export function patchCard(card: HTMLElement, info: LiveInfo) {
  card.dataset.hidden = info.hidden ? '1' : '';
  card.dataset.status = info.status;
  if (typeof info.askingPrice === 'number') card.dataset.price = String(info.askingPrice);
  card.classList.toggle('unavailable', info.status !== 'available');
  card.classList.toggle('sold', info.status === 'sold' || info.status === 'given');
  card.classList.toggle('onhold', info.status === 'reserved');
  const asking = card.querySelector('[data-asking]');
  if (asking) asking.textContent = fmt(info.askingPrice);
  const badge = card.querySelector<HTMLElement>('[data-badge]');
  if (badge) {
    badge.hidden = info.status === 'available';
    badge.className = `status-badge ${info.status}`;
    badge.textContent = STATUS_LABEL[info.status];
  }
}
