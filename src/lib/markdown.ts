// Tiny, safe Markdown renderer for product descriptions.
// Supports: paragraphs (blank-line separated), single line breaks, "- " / "* " bullet lists,
// "1. " numbered lists, **bold**, *italic* / _italic_. All HTML in the source is escaped,
// so descriptions can never inject markup. Plain-text descriptions render as one paragraph.

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const inline = (s: string) =>
  escapeHtml(s)
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?![\w*])/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1<em>$2</em>');

const BULLET = /^\s*[-*•]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

export function renderDescription(md: string | undefined | null): string {
  if (!md) return '';
  const blocks = md.replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) continue;
    // A block may start with a paragraph line (e.g. "**Highlights**") followed by list items.
    let i = 0;
    const para: string[] = [];
    while (i < lines.length && !BULLET.test(lines[i]) && !NUMBER.test(lines[i])) para.push(lines[i++]);
    if (para.length) out.push(`<p>${para.map((l) => inline(l.trim())).join('<br />')}</p>`);
    while (i < lines.length) {
      const ordered = NUMBER.test(lines[i]);
      const re = ordered ? NUMBER : BULLET;
      const items: string[] = [];
      while (i < lines.length && (re.test(lines[i]) || (!BULLET.test(lines[i]) && !NUMBER.test(lines[i])))) {
        if (re.test(lines[i])) items.push(lines[i].replace(re, '').trim());
        else items[items.length - 1] += ' ' + lines[i].trim(); // continuation line
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
    }
  }
  return out.join('\n');
}

/** Markdown -> single-line plain text, for meta/og descriptions. */
const stripInline = (s: string) =>
  s
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    .replace(/(^|[^\w*])\*([^*]+?)\*(?![\w*])/g, '$1$2')
    .replace(/(^|[^\w])_([^_]+?)_(?!\w)/g, '$1$2');

/** Markdown -> single-line plain text, for meta/og descriptions. Heading-only lines are dropped. */
export function plainDescription(md: string | undefined | null, max = 300): string {
  if (!md) return '';
  const text = md
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => !/^\s*\*\*[^*]+\*\*\s*$/.test(l) || /[.!?]\*\*\s*$/.test(l))
    .map((l) => stripInline(l.replace(BULLET, '').replace(NUMBER, '')).trim())
    .filter(Boolean)
    .map((l) => (/[.:!?]$/.test(l) ? l : l + '.'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text;
}
