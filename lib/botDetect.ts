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
// What is stored is one coarse word - 'ai', 'search', 'preview' - which says
// what kind of client it was and cannot identify anyone. That is the same
// bargain lib/siteEvents.ts already documents: no IP, no user agent string, no
// identifiers.

/** The kinds worth telling apart on the dashboard. `null` means a person. */
export type BotKind = 'ai' | 'search' | 'seo' | 'preview' | 'automation' | 'monitor' | 'other';

// Ordered: the first list that matches wins, so a specific family beats the
// generic catch-all at the bottom. Every entry is matched case-insensitively
// against the raw user agent.
const FAMILIES: Array<{ kind: BotKind; patterns: RegExp }> = [
  {
    // Assistants and the crawlers that feed them. Worth its own bucket: these
    // are the ones whose presence is good news, and they are also the ones
    // most likely to be confused with a visit, since some render JavaScript.
    kind: 'ai',
    patterns:
      /gptbot|oai-searchbot|chatgpt-user|openai|perplexitybot|perplexity-user|claudebot|claude-web|claude-user|anthropic-ai|google-extended|bytespider|ccbot|cohere-ai|youbot|diffbot|timpibot|omgili|meta-externalagent|amazonbot|applebot-extended|mistralai/i,
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

/** Hebrew labels for the dashboard. */
export const BOT_KIND_LABELS: Record<BotKind, string> = {
  ai: 'מנועי AI',
  search: 'מנועי חיפוש',
  seo: 'כלי SEO',
  preview: 'תצוגה מקדימה של קישור',
  automation: 'סקריפט או דפדפן מונחה',
  monitor: 'ניטור וביצועים',
  other: 'בוט אחר',
};
