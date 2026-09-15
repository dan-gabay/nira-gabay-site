// Tell an automated client from a person, by user agent, without keeping the
// user agent.
//
// Why this exists: 82 of 479 visits in the 30 days to 2026-09-14 were desktop
// sessions with no referrer, landing straight on a deep article URL, one page
// each, never the same page twice, spread evenly across the clock including
// 02:00 and 05:20. 39 of them fired `article_read` - which proves nothing,
// because that event is a 30-second timer with no scroll requirement
// (components/ArticleReadTracker.tsx). Not one fired `article_completed`,
// which needs the end of the article body to actually come into view. Groups
// a third the size produced completions; that group produced none. It loads
// pages and waits.
//
// The point is to LABEL, not to block. Nothing here runs before content is
// served - a crawler that wants the page still gets the page, which is the
// whole point of being in an AI index. This only decides whether a hit counts
// as a visit in the dashboard.
//
// PRIVACY. app/api/track/route.ts reads the user agent, passes it through here
// and discards it, exactly as it already does to reduce it to mobile/desktop.
// What is stored is one coarse word - 'ai_answer', 'search', 'preview' - which
// says what kind of client it was and cannot identify anyone. That is the same
// bargain lib/siteEvents.ts already documents: no IP, no user agent string, no
// identifiers.
//
// The AI bucket is two words and not one, since 2026-09-15. A crawler building
// a training set and an assistant fetching the page mid-conversation to answer
// someone were both landing in 'ai', which made the number unreadable: it could
// double because a scraper got keener, or because more people were being shown
// the site, and nothing on the dashboard could tell those apart. The user agent
// says which, and it is the only thing that does - the fetches are otherwise
// identical. See the two families below.

/** The kinds worth telling apart on the dashboard. `null` means a person. */
export type BotKind =
  | 'ai_answer'
  | 'ai_crawler'
  | 'search'
  | 'seo'
  | 'preview'
  | 'automation'
  | 'monitor'
  | 'other';

/**
 * What can be found in `site_events.bot_kind`, which is not the same set.
 *
 * Rows written between 2026-09-14 and the split carry the old coarse 'ai'.
 * The user agent was discarded at write time, so those rows can never be
 * re-sorted into answer and crawler - they are what they are, and the
 * dashboard has to keep a name for them rather than print a raw slug.
 */
export type StoredBotKind = BotKind | 'ai';

// Ordered: the first list that matches wins, so a specific family beats the
// generic catch-all at the bottom. Every entry is matched case-insensitively
// against the raw user agent.
const FAMILIES: Array<{ kind: BotKind; patterns: RegExp }> = [
  {
    // An assistant fetching this page BECAUSE SOMEONE JUST ASKED IT SOMETHING.
    //
    // This is the only bucket on the page that is evidence of a reader. Every
    // agent listed here is documented by its own vendor as user-initiated:
    // the fetch happens inside a live conversation, so the page was pulled to
    // be read back to a person, usually with a link. It is the closest thing
    // the site gets to a visit it cannot see - no page_view, no scroll, no
    // session, because the person is reading the answer and not the site.
    //
    // Keep the list strict. Every crawler moved in here makes the figure
    // bigger and makes it mean less, which defeats the reason for splitting.
    // Listed first so it wins: ChatGPT-User carries "openai.com" in its UA and
    // would otherwise be swallowed by the crawler pattern below.
    kind: 'ai_answer',
    patterns:
      /chatgpt-user|perplexity-user|claude-user|claude-web|duckassistbot|meta-externalfetcher|mistralai-user|cohere-user/i,
  },
  {
    // The same companies, reading the site on their own schedule: training
    // corpora and the indexes their answers are drawn from. Nobody is waiting
    // on the other end of these.
    //
    // Not bad news - being in the index is how the bucket above ever happens,
    // and OAI-SearchBot in particular is what puts the site in ChatGPT's
    // search results. It is just not a reader, and counting it as one was the
    // thing that made the old 'ai' number impossible to act on.
    kind: 'ai_crawler',
    patterns:
      /gptbot|oai-searchbot|openai|perplexitybot|claudebot|claude-searchbot|anthropic-ai|google-extended|bytespider|ccbot|cohere-ai|youbot|diffbot|timpibot|omgili|meta-externalagent|amazonbot|applebot-extended|mistralai/i,
  },
  {
    kind: 'search',
    patterns: /googlebot|google-inspectiontool|storebot-google|bingbot|slurp|duckduckbot|baiduspider|yandex(bot|images)|applebot|sogou|exabot|seznambot|naver/i,
  },
  {
    kind: 'seo',
    patterns: /ahrefsbot|semrushbot|mj12bot|dotbot|rogerbot|screaming ?frog|serpstatbot|dataforseo|petalbot|seokicks|sitebulb|blexbot|barkrowler|zoominfobot/i,
  },
  {
    // Link unfurlers. A person clicking a link in WhatsApp arrives in their own
    // browser; this is the fetch the app makes to draw the preview card.
    kind: 'preview',
    patterns: /facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|slack-imgproxy|discordbot|embedly|pinterest|skypeuripreview|redditbot|vkshare|quora link preview|nuzzel|outbrain/i,
  },
  {
    // Driven browsers and plain HTTP clients. headlesschrome and
    // navigator.webdriver are the two that catch a real rendering engine being
    // steered by a script - the case the behavioural signature pointed at.
    kind: 'automation',
    patterns: /headlesschrome|phantomjs|puppeteer|playwright|selenium|webdriver|python-requests|python-urllib|curl\/|wget\/|libwww-perl|axios\/|node-fetch|got \(|go-http-client|java\/|okhttp|scrapy|httpx|aiohttp|postmanruntime|insomnia/i,
  },
  {
    kind: 'monitor',
    patterns: /uptimerobot|pingdom|statuscake|betteruptime|site24x7|newrelicpinger|datadog|gtmetrix|lighthouse|pagespeed|chrome-lighthouse|vercel-(screenshot|favicon|og)/i,
  },
  {
    // Anything that says what it is. Deliberately last, so a named family above
    // is never swallowed by it.
    kind: 'other',
    patterns: /\bbot\b|bot\/|crawler|crawling|spider|scrape|scraping|feedfetcher|archive\.org_bot|ia_archiver|headless/i,
  },
];

/**
 * What kind of automated client this user agent is, or `null` for a person.
 *
 * A missing user agent is treated as automation: every real browser sends one,
 * and a client that does not is either a script or is hiding, and neither is a
 * visit worth counting.
 */
export function botKindFromUserAgent(ua: string | null | undefined): BotKind | null {
  if (!ua || !ua.trim()) return 'automation';
  for (const { kind, patterns } of FAMILIES) {
    if (patterns.test(ua)) return kind;
  }
  return null;
}

/** Convenience for the places that only care whether it was a person. */
export const isBotUserAgent = (ua: string | null | undefined): boolean =>
  botKindFromUserAgent(ua) !== null;

/** Hebrew labels for the dashboard, including the pre-split rows. */
export const BOT_KIND_LABELS: Record<StoredBotKind, string> = {
  ai_answer: 'AI בתשובה למישהו',
  ai_crawler: 'סריקת AI',
  ai: 'AI לפני הפיצול',
  search: 'מנועי חיפוש',
  seo: 'כלי SEO',
  preview: 'תצוגה מקדימה של קישור',
  automation: 'סקריפט או דפדפן מונחה',
  monitor: 'ניטור וביצועים',
  other: 'בוט אחר',
};
