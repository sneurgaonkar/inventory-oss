import { siteConfig } from '../../site.config';
import { useEffect, useState, type FormEvent } from 'react';

export type ShortlistItem = { slug: string; title: string; price: number };
const KEY = 'shortlist';

export const readShortlist = (): ShortlistItem[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
export const writeShortlist = (items: ShortlistItem[]) => {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('shortlist:change'));
};
export const toggleShortlist = (item: ShortlistItem) => {
  const items = readShortlist();
  const exists = items.some((i) => i.slug === item.slug);
  writeShortlist(exists ? items.filter((i) => i.slug !== item.slug) : [...items, item]);
  return !exists;
};

const fmt = (n: number) => (n === 0 ? 'Free' : `${siteConfig.currencySymbol}${n.toLocaleString(siteConfig.locale)}`);

type Props = { web3formsKey?: string };

export default function Shortlist({ web3formsKey }: Props) {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const sync = () => setItems(readShortlist());
    sync();
    window.addEventListener('shortlist:change', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('shortlist:change', sync); window.removeEventListener('storage', sync); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const summary = items.map((i) => `• ${i.title} (${fmt(i.price)}) ${origin}/items/${i.slug}/`).join('\n');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!web3formsKey) return;
    setState('sending');
    const fd = new FormData(e.currentTarget);
    fd.append('access_key', web3formsKey);
    fd.append('subject', `${siteConfig.siteName}: ${fd.get('name')} is interested in ${items.length} item(s)`);
    fd.append('items', summary);
    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd });
      const json = (await res.json()) as { success: boolean; message?: string };
      if (!json.success) throw new Error(json.message);
      setState('sent');
      writeShortlist([]);
    } catch { setState('error'); }
  }

  return (
    <>
      <button className="shortlist-toggle" onClick={() => setOpen(true)} aria-label={`Open shortlist (${items.length} item${items.length === 1 ? '' : 's'})`} aria-haspopup="dialog">
        <span className="inner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" /></svg>
          Shortlist
          {items.length > 0 && <span className="count">{items.length}</span>}
        </span>
      </button>
      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your shortlist" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <span className="drawer-kicker">{items.length} object{items.length === 1 ? '' : 's'}</span>
                <strong className="drawer-title">Your shortlist</strong>
              </div>
              <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Close shortlist">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </header>
            {items.length === 0 ? (
              <p className="muted">Nothing yet. Tap “I’m interested” on any item.</p>
            ) : (
              <ul>
                {items.map((i) => (
                  <li key={i.slug}>
                    <a href={`/items/${i.slug}/`}>{i.title}</a>
                    <span className="muted">{fmt(i.price)}</span>
                    <button className="link" onClick={() => toggleShortlist(i)} aria-label={`Remove ${i.title}`}>✕</button>
                  </li>
                ))}
              </ul>
            )}
            {items.length > 0 && (
              <>
                {web3formsKey && state !== 'sent' && (
                  <form onSubmit={submit} className="form">
                    <p className="muted">Leave your details and I’ll get back to you.</p>
                    <input name="name" placeholder="Your name" aria-label="Your name" autoComplete="name" required />
                    <input name="email" type="email" placeholder="Email" aria-label="Email" autoComplete="email" required />
                    <input name="phone" type="tel" placeholder="Phone / WhatsApp (optional)" aria-label="Phone or WhatsApp (optional)" autoComplete="tel" />
                    <textarea name="message" placeholder="Anything else? Offer, pickup time…" aria-label="Message" rows={3} />
                    <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />
                    <button className="btn primary send" disabled={state === 'sending'}>
                      {state === 'sending' ? 'Sending…' : 'Send'}
                    </button>
                    {state === 'error' && <p className="error">Couldn’t send — please try again in a moment.</p>}
                  </form>
                )}
              </>
            )}
            {state === 'sent' && <p className="ok">Sent! I’ll get back to you soon.</p>}
          </aside>
        </div>
      )}
      <style>{`
        .drawer-backdrop { position: fixed; inset: 0; background: rgba(20,20,20,.45); z-index: 150; animation: sl-fade .25s ease; }
        .drawer { position: absolute; right: 0; top: 0; bottom: 0; width: min(440px, 100%); background: var(--card); padding: 28px 28px 32px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; box-shadow: -12px 0 40px rgba(0,0,0,.12); animation: sl-in .35s var(--ease); }
        .drawer header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .drawer-kicker { display: block; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
        .drawer-title { font-family: var(--font-display); font-weight: 500; font-size: 24px; letter-spacing: -.02em; line-height: 1.15; }
        .drawer-close { width: 36px; height: 36px; border-radius: 50%; border: 0; background: var(--input-bg); color: var(--fg-2); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .drawer-close:hover { color: var(--fg); }
        .drawer ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; border-top: 1px solid var(--line); }
        .drawer li { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center; border-bottom: 1px solid var(--line); padding: 12px 0; font-size: 14px; line-height: 1.35; }
        .drawer li a { text-decoration: none; font-weight: 500; }
        .drawer li a:hover { text-decoration: underline; text-underline-offset: 3px; }
        .drawer li .muted { font-weight: 600; font-size: 13px; color: var(--fg); }
        .drawer .muted { color: var(--muted); font-size: 14px; margin: 0; }
        .link { background: none; border: 0; cursor: pointer; color: var(--muted); font-size: 13px; padding: 4px; }
        .link:hover { color: var(--fg); }
        .form { display: flex; flex-direction: column; gap: 10px; }
        .form input, .form textarea { padding: 12px 14px; border: 1px solid transparent; background: var(--bg); border-radius: 10px; font: 400 14px/1.4 var(--font-body); color: var(--fg); transition: border-color .2s ease, background-color .2s ease; }
        .form input:focus, .form textarea:focus { outline: none; border-color: var(--fg); background: #fff; }
        .form input::placeholder, .form textarea::placeholder { color: var(--muted); }
        .form .send { margin-top: 4px; width: 100%; }
        .hidden { display: none; }
        .error { color: var(--danger); font-size: 14px; margin: 0; }
        .ok { color: var(--ok); font-weight: 600; margin: 0; }
        @keyframes sl-fade { from { opacity: 0 } }
        @keyframes sl-in { from { transform: translateX(24px); opacity: 0 } }
      `}</style>
    </>
  );
}
