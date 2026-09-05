// RFC 7231 §5.3.2 Accept negotiation, used to decide whether a request wants
// HTML or Markdown (RFC 7763 `text/markdown`).
//
// The reason this is a parser and not `accept.includes('text/markdown')`:
// the substring test cannot tell these two apart, and they mean opposite
// things.
//
//   Accept: text/html;q=0.9, text/markdown        -> wants markdown
//   Accept: text/markdown;q=0.5, text/html        -> wants html
//
// It also gets browsers wrong in the other direction. Chrome sends
// `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`; a
// substring test for a markdown offer against `*/*` would hand a person a
// text file. So: parse, rank by q, break ties by specificity, and pick the
// first offer that survives.

export type MediaRange = {
  type: string;
  subtype: string;
  /** Quality value, 0-1. Absent means 1. q=0 means "not acceptable". */
  q: number;
  // 2 = concrete type/subtype, 1 = type wildcard, 0 = full wildcard.
  specificity: number;
  /** Position in the original header, for a stable tie-break. */
  order: number;
};

/** What this site can serve, in the order it prefers to serve it. */
export const HTML = 'text/html';
export const MARKDOWN = 'text/markdown';

/**
 * `text/markdown` is the registered type (RFC 7763). `text/x-markdown` is the
 * pre-registration spelling and still turns up in the wild, so it is honoured
 * on the way in - but never sent back out, because it is not the standard.
 */
const MARKDOWN_ALIASES = new Set(['text/markdown', 'text/x-markdown']);

/**
 * Splits on commas that are not inside a quoted string. Parameter values may
 * be quoted strings (RFC 7230 §3.2.6) and a quoted string may contain a comma,
 * which a plain `.split(',')` would cut in half.
 */
function splitMediaRanges(header: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  let escaped = false;
  for (const ch of header) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && inQuotes) {
      current += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

/**
 * A q value is a number 0-1 with at most three decimals. Anything outside that
 * is treated as absent (q=1) rather than as zero: a malformed parameter should
 * not silently make a representation unacceptable.
 */
function parseQ(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function parseAccept(header: string | null | undefined): MediaRange[] {
  if (!header || !header.trim()) return [];

  const ranges: MediaRange[] = [];
  splitMediaRanges(header).forEach((raw, order) => {
    const parts = raw.split(';');
    const mediaType = (parts.shift() || '').trim().toLowerCase();
    const slash = mediaType.indexOf('/');
    if (slash <= 0) return;

    const type = mediaType.slice(0, slash);
    const subtype = mediaType.slice(slash + 1);
    if (!type || !subtype) return;
    // `*/html` is not a thing: a wildcard type with a concrete subtype.
    if (type === '*' && subtype !== '*') return;

    let q = 1;
    for (const param of parts) {
      const eq = param.indexOf('=');
      if (eq < 0) continue;
      if (param.slice(0, eq).trim().toLowerCase() !== 'q') continue;
      q = parseQ(param.slice(eq + 1).trim().replace(/^"|"$/g, ''));
      // Everything after q is an accept-ext, not a media-type parameter, and
      // a later `q=` inside one does not override the real one.
      break;
    }

    ranges.push({
      type,
      subtype,
      q,
      specificity: type === '*' ? 0 : subtype === '*' ? 1 : 2,
      order,
    });
  });

  return ranges.sort(
    (a, b) => b.q - a.q || b.specificity - a.specificity || a.order - b.order,
  );
}

function matches(range: MediaRange, offer: string): boolean {
  const [type, subtype] = offer.split('/');
  if (range.type === '*') return true;
  if (range.type !== type) return false;
  return range.subtype === '*' || range.subtype === subtype;
}

/** Expands an offer to every spelling a client might have asked for. */
function offerAliases(offer: string): string[] {
  return offer === MARKDOWN ? [...MARKDOWN_ALIASES] : [offer];
}

/**
 * Picks the best of `offers` for this Accept header, or null if the client
 * explicitly ruled all of them out.
 *
 * `offers` is in server-preference order, which settles ties the client left
 * open - `Accept: * / *` and a missing header both land on the first offer.
 */
export function negotiate(
  header: string | null | undefined,
  offers: readonly string[] = [HTML, MARKDOWN],
): string | null {
  const ranges = parseAccept(header);
  // No header at all: RFC 7231 says any type is acceptable.
  if (ranges.length === 0) return offers[0] ?? null;

  for (const range of ranges) {
    if (range.q === 0) continue;
    for (const offer of offers) {
      if (offerAliases(offer).some((alias) => matches(range, alias))) return offer;
    }
  }
  return null;
}

/**
 * The single question the middleware asks.
 *
 * Note what happens when nothing matches - `Accept: application/pdf` on an
 * article, say. RFC 7231 §5.3.2 allows either a 406 or ignoring the header and
 * sending a default representation, and this site takes the second option: a
 * 406 to a crawler with an unusual Accept header costs a real page an index
 * entry, and no client that actually wants markdown is affected by it.
 */
export function prefersMarkdown(header: string | null | undefined): boolean {
  return negotiate(header, [HTML, MARKDOWN]) === MARKDOWN;
}
