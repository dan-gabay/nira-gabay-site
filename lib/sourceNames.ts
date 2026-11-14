// The sites that send visitors here, by the name Nira and Dan know them by.
//
// A visit from a directory carries its name twice, and not always both times:
// the profile link is tagged (?utm_source=hebpsy&utm_medium=directory, see
// nira-growth/directories.md) and the browser usually adds the referring host
// (www.hebpsy.net). Either one alone is enough to say where the visit came
// from, so both spellings map to the same name here, and the dashboard rows
// that differ only in spelling are merged under it.
//
// A source missing from this list is still shown, by its raw tag or host:
// nothing that carries a source is ever reported as a direct visit.

const NAMES: Array<[RegExp, string]> = [
  [/^(www\.)?hebpsy(\.net)?$/i, 'פסיכולוגיה עברית'],
  [/^(www\.)?koltipul(\.co\.il)?$/i, 'כל טיפול'],
  [/^(www\.)?mentalytics(\.co\.il)?$/i, 'מנטליטיקס'],
  [/^(www\.)?(b144(\.co\.il)?|bezeq144)$/i, 'בזק 144'],
  [/^(www\.)?parent\.org\.il$/i, 'פורום אמפטיה (parent.org.il)'],
  [/^(www\.)?(m-yehuda(\.org\.il)?)$/i, 'מועצה אזורית מטה יהודה'],
  [/^(www\.)?(m-zion(\.org\.il)?)$/i, 'מבשרת ציון'],
  [/^(www\.)?m-y-net(\.co\.il)?$/i, 'מיינט (m-y-net)'],
  [/^(www\.)?(parenthub(\.co\.il)?)$/i, 'פרנטהאב'],
  [/^(www\.)?(li-cbt(\.org\.il)?)$/i, 'האגודה הישראלית ל-CBT'],
  [/^(www\.)?(hakehila(\.co\.il)?)$/i, 'הקהילה'],
];

/** A referring site's display name, from its utm_source tag or its host. */
export function sourceName(raw: string | null | undefined): string {
  const v = (raw || '').trim();
  if (!v) return '';
  for (const [re, name] of NAMES) if (re.test(v)) return name;
  return v.replace(/^www\./i, '');
}

/**
 * Rows that name the same site under two spellings (the tag and the host),
 * summed into one row per display name. Order is by visits, highest first.
 */
export function mergeBySourceName<T extends { detail: string | null; visits: number; conversions: number }>(
  rows: T[],
): Array<T & { name: string }> {
  const out = new Map<string, T & { name: string }>();
  for (const r of rows) {
    const name = sourceName(r.detail);
    const prev = out.get(name);
    if (prev) {
      prev.visits += r.visits;
      prev.conversions += r.conversions;
    } else {
      out.set(name, { ...r, name });
    }
  }
  return [...out.values()].sort((a, b) => b.visits - a.visits);
}
