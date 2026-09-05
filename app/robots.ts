import { MetadataRoute } from 'next'
import { BASE_URL } from '@/lib/identitySchema'

// One rule, repeated per crawler.
//
// The repetition is not redundancy - it is the point. robots.txt group
// selection is winner-take-all: a crawler that finds a group naming it reads
// *only* that group and ignores `*` entirely. So a named group must restate
// everything, and the only safe way to keep six groups from drifting apart is
// to write the rule once and spread it.
//
// Why name them at all when `*` already allows them: an explicit group is a
// statement of intent that survives someone later tightening `*`, and Bing
// Webmaster Tools and the AI crawlers' own diagnostics report on the group
// that matched. Being named there is worth the four lines.
const PUBLIC_RULE = (): { allow: string[]; disallow: string[] } => ({
  // /api/md/* is the Markdown representation of the public pages and is meant
  // to be fetched. The Allow is longer than the Disallow, so it wins under
  // longest-match precedence (Google, Bing and the OpenAI/Perplexity crawlers
  // all implement it). Everything else under /api/ stays shut - including
  // /api/preview, which mints the draft-mode cookie.
  allow: ['/', '/api/md/'],
  // '/manage' without the slash covers the bare route; '/manage/' covers the
  // subtree. The old rule had only the second, so /manage itself was crawlable.
  disallow: ['/api/', '/manage', '/manage/'],
})

// Bingbot serves Bing, Yahoo and (for a large share of results) DuckDuckGo, so
// it is the single most valuable crawler on this list after Googlebot.
// OAI-SearchBot indexes for ChatGPT Search; ChatGPT-User is the fetch ChatGPT
// makes when a user's question needs the live page. Perplexity runs the same
// split. All four have to be able to reach the article bodies.
const NAMED_CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', ...PUBLIC_RULE() },
      ...NAMED_CRAWLERS.map((userAgent) => ({ userAgent, ...PUBLIC_RULE() })),
    ],
    // No `host:` directive. Yandex deprecated it in 2018 and Google and Bing
    // never read it; the canonical host is stated by the canonical tags and by
    // the absolute URLs in the sitemaps, which is where crawlers look.
    sitemap: [`${BASE_URL}/sitemap.xml`, `${BASE_URL}/sitemap-images.xml`],
  }
}
