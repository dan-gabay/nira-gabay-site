import { NextResponse } from 'next/server';
import { BING_SITE_VERIFICATION } from '@/lib/verification';

// The file-upload half of Bing Webmaster Tools verification. Bing hands you a
// BingSiteAuth.xml to place at the site root; this serves it from the env var
// instead, so the token is never committed and rotating it is a settings
// change rather than a deploy of new source.
//
// Format is Bing's, exactly: one <users> element containing one <user>.

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!BING_SITE_VERIFICATION) {
    // Nothing configured yet. A 404 is the honest answer - an empty or
    // placeholder file would fail Bing's check with a much less obvious error.
    return new NextResponse('Not Found', { status: 404 });
  }

  const xml = `<?xml version="1.0"?>\n<users>\n  <user>${BING_SITE_VERIFICATION}</user>\n</users>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300',
      // A verification token is not a page. Keep it out of the index.
      'X-Robots-Tag': 'noindex',
    },
  });
}
