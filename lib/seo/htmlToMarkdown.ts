// The editorial rewrite (OpenAI path) returns HTML using <h2>/<p>, but article
// content is rendered with react-markdown (no raw-HTML plugin), so HTML headings
// would not render. Convert the limited tag set we emit into Markdown so the
// stored content renders correctly and its heading structure is real.
//
// If the input contains no block-level HTML tags it is assumed to be Markdown
// already and returned unchanged.

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function inlineToMarkdown(html: string): string {
  let t = html;
  t = t.replace(/<\s*(strong|b)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, '**$2**');
  t = t.replace(/<\s*(em|i)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, '*$2*');
  t = t.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  t = t.replace(/<br\s*\/?>/gi, '  \n');
  t = t.replace(/<[^>]+>/g, ''); // drop any remaining inline tags
  return decodeEntities(t).replace(/[ \t]+/g, ' ').trim();
}

export function looksLikeHtml(content: string): boolean {
  return /<(h[1-6]|p|ul|ol|li|div|br|strong|em|a)\b/i.test(content);
}

export function htmlToMarkdown(content: string): string {
  if (!looksLikeHtml(content)) return content.trim();

  const blocks: string[] = [];

  // Headings
  let html = content.replace(/\r\n/g, '\n');

  // Lists -> markdown bullets / numbers (do before generic block handling).
  html = html.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner: string) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((li) => '- ' + inlineToMarkdown(li[1]))
      .join('\n');
    return '\n\n' + items + '\n\n';
  });
  html = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner: string) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((li, i) => `${i + 1}. ` + inlineToMarkdown(li[1]))
      .join('\n');
    return '\n\n' + items + '\n\n';
  });

  // Headings -> ##/### etc.
  html = html.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl: string, inner: string) => {
    const hashes = '#'.repeat(parseInt(lvl, 10));
    return `\n\n${hashes} ${inlineToMarkdown(inner)}\n\n`;
  });

  // Paragraphs
  html = html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, inner: string) => {
    const text = inlineToMarkdown(inner);
    return text ? `\n\n${text}\n\n` : '\n\n';
  });

  // Any leftover wrapper tags
  html = html.replace(/<\/?(div|section|article|span)[^>]*>/gi, '\n\n');

  // Whatever inline tags remain
  const text = inlineToMarkdownBlock(html);

  // Normalise blank lines.
  for (const para of text.split(/\n{2,}/)) {
    const p = para.trim();
    if (p) blocks.push(p);
  }
  return blocks.join('\n\n').trim();
}

// Like inlineToMarkdown but preserves existing newlines (used on a whole block).
function inlineToMarkdownBlock(html: string): string {
  let t = html;
  t = t.replace(/<\s*(strong|b)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, '**$2**');
  t = t.replace(/<\s*(em|i)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi, '*$2*');
  t = t.replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  t = t.replace(/<br\s*\/?>/gi, '  \n');
  t = t.replace(/<[^>]+>/g, '');
  return decodeEntities(t);
}
