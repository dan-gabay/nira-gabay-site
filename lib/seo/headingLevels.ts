// Demote markdown H1 headings in article bodies to H2.
//
// Why this exists: the article page renders the body with react-markdown under
// `components={{ h1: 'h2' }}` (app/articles/[slug]/page.tsx), so a `# ` in the
// stored content already reaches the reader as an <h2>. The HTML surface is
// therefore fine, and converting `# ` to `## ` changes nothing a visitor sees.
//
// Two other surfaces are not fine, and neither of them has that remap:
//
//   1. lib/agent/markdown.ts emits `# {title}` and then passes the body through
//      untouched. On the Markdown representation - the one middleware.ts serves
//      to OAI-SearchBot, PerplexityBot and friends, and the one at /api/md/* -
//      every `# ` in the body sits at the same level as the article title. A
//      body with nine of them is a document with ten H1s and no hierarchy.
//   2. app/articles/[slug]/page.tsx splitAtThirdH2() looks for the literal
//      "\n## " to place the in-body "מומלץ לקרוא גם" aside. An article whose
//      sections are all `# ` never reaches three matches, so it silently loses
//      its contextual internal links.
//
// lib/seo/validate.ts has flagged this all along as the `content_has_h1` warn
// ("מומרות ל-H2 בתצוגה, אך עדיף לתקן במקור"). This is the "תקן במקור" half.
//
// Deliberately narrow: it moves H1 to H2 and touches nothing else. Collapsing
// the H2s of an article that mixes both levels down to H3 would restore the
// author's intended hierarchy, but it is a visible change (.prose h3 is smaller
// and amber-900 where .prose h2 is stone-900), so it is a separate decision and
// not this function's job.

/** A heading as the reader receives it, after the h1 -> h2 render remap. */
export type RenderedHeading = { level: 2 | 3 | 4 | 5 | 6; text: string };

const ATX = /^(#{1,6}) +(.*)$/;

/**
 * The heading sequence the article page actually renders, given stored
 * markdown. `#` and `##` both land on <h2>; everything else keeps its level.
 * Fenced code blocks are skipped so a `#` comment is never read as a heading.
 */
export function renderedHeadings(content: string): RenderedHeading[] {
  const out: RenderedHeading[] = [];
  let inFence = false;

  for (const line of content.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = ATX.exec(line);
    if (!m) continue;
    const level = Math.max(2, m[1].length) as RenderedHeading['level'];
    out.push({ level, text: m[2].trim() });
  }

  return out;
}

/**
 * Rewrite every `# ` heading as `## `. Returns the content unchanged when it
 * has none, so callers can skip the write.
 */
export function demoteH1ToH2(content: string): string {
  let inFence = false;

  return content
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.replace(/^# (?= *\S)/, '## ');
    })
    .join('\n');
}

/**
 * The safety property the migration rests on: demoting H1s must not change a
 * single heading the reader sees. Compares the full rendered sequence, levels
 * and text, not just the counts - a transform that dropped or reordered a
 * heading would keep the counts equal.
 */
export function renderedOutputUnchanged(before: string, after: string): boolean {
  const a = renderedHeadings(before);
  const b = renderedHeadings(after);
  if (a.length !== b.length) return false;
  return a.every((h, i) => h.level === b[i].level && h.text === b[i].text);
}

/** Whether splitAtThirdH2() in app/articles/[slug]/page.tsx will find its split
 *  point, and so whether the in-body internal-link aside gets rendered. */
export function hasInBodyAside(content: string): boolean {
  let from = 0;
  for (let i = 0; i < 3; i++) {
    const idx = content.indexOf('\n## ', from);
    if (idx === -1) return false;
    from = idx + 4;
  }
  return true;
}
