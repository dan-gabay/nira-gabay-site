import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Enables Next.js Draft Mode and redirects into the real article page, which
// checks draftMode().isEnabled to bypass the is_published filter. This is
// what lets /manage preview drafts using the exact same rendering as the
// live site, instead of the public route always 404ing on unpublished slugs.
//
// The secret is a weak gate at best - see the note in app/manage/articles -
// the manage panel itself currently has no login, so this only stops a
// stranger from guessing this specific URL pattern, not someone who already
// found the manage panel and its own (unauthenticated) article list.
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const slug = request.nextUrl.searchParams.get('slug');

  if (!process.env.NEXT_PUBLIC_PREVIEW_SECRET || secret !== process.env.NEXT_PUBLIC_PREVIEW_SECRET) {
    return new Response('Invalid or missing preview secret', { status: 401 });
  }
  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  redirect(`/articles/${slug}`);
}
