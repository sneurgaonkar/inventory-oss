import { useEffect, useState } from 'react';
import { readShortlist, toggleShortlist, type ShortlistItem } from './Shortlist';

const api = (slug: string) => `/api/interest/${slug}`;
// Slugs this browser has already been counted for, so remove + re-add (or a new network) never counts twice.
const COUNTED = 'interest:counted';
const counted = (): string[] => { try { return JSON.parse(localStorage.getItem(COUNTED) || '[]'); } catch { return []; } };
const markCounted = (slug: string) => { try { localStorage.setItem(COUNTED, JSON.stringify([...new Set([...counted(), slug])])); } catch {} };
type Interest = { count: number };

export default function InterestedButton({ item }: { item: ShortlistItem }) {
  const [on, setOn] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setOn(readShortlist().some((i) => i.slug === item.slug));
    sync();
    window.addEventListener('shortlist:change', sync);
    fetch(api(item.slug)).then((r) => (r.ok ? (r.json() as Promise<Interest>) : null)).then((d) => d && setCount(d.count)).catch(() => {});
    return () => window.removeEventListener('shortlist:change', sync);
  }, [item.slug]);

  async function click() {
    const added = toggleShortlist(item);
    if (!added) return; // removing from shortlist doesn't count
    if (counted().includes(item.slug)) return; // this browser was already counted for this item
    try {
      const r = await fetch(api(item.slug), { method: 'POST' });
      if (r.ok) { setCount(((await r.json()) as Interest).count); markCounted(item.slug); }
    } catch {}
  }

  return (
    <button className={`btn interested ${on ? 'on' : 'primary'}`} onClick={click} aria-pressed={on}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" /></svg>
      {on ? 'In your shortlist · Remove' : 'I’m interested'}
      {count > 0 && <span className="interest-count">{count} interested</span>}
    </button>
  );
}
