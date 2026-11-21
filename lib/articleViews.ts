// articles.views_count, counted on the server from the same page_view that
// /manage/analytics counts.
//
// It used to be counted in the browser (app/articles/ArticleInteractions.tsx):
// an RPC, increment_article_views, that was never created in the database, and
// a fallback that wrote `views_count = initialViewsCount + 1`. initialViewsCount
// came from the article page, which is statically cached for an hour
// (revalidate = 3600), so every visitor inside that hour wrote the SAME number:
// 34 openings of relationship-red-flags on 20-21 Nov 2026 moved the counter by
// a few, and it read 31 against 51 page views since 2 Sep. It also needed the
// anonymous key to be able to UPDATE articles, which B-21 (RLS) will close.
//
// Now /api/track, which already runs only on the live deployment, skips the
// owner and labels bots, bumps the counter after it stores a page_view. One
// counter, one definition: a human page view of a published article.

import type { SupabaseClient } from '@supabase/supabase-js';

const ARTICLE_PATH = /^\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;

/**
 * The article slug whose counter this event should move, or null.
 * The slug is read from the path, never from a client-supplied entity, and
 * only a page_view by a person counts.
 */
export function articleSlugForView(
  eventName: string,
  path: string | null,
  botKind: string | null,
): string | null {
  if (eventName !== 'page_view' || botKind || !path) return null;
  const m = ARTICLE_PATH.exec(path.split(/[?#]/)[0]);
  if (!m || m[1] === 'topic') return null;
  return m[1];
}

/**
 * +1 on a published article's views_count, without a database function.
 * Compare-and-set: the update only lands if nobody else wrote in between, and
 * a lost race retries with a fresh read, so concurrent visitors are not merged
 * into one view the way the cached client value merged them.
 */
export async function incrementArticleViews(
  supabase: SupabaseClient,
  slug: string,
  attempts = 3,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, views_count')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (error || !data) return false;

    const current = (data.views_count as number | null) ?? 0;
    let update = supabase
      .from('articles')
      .update({ views_count: current + 1 })
      .eq('id', data.id);
    update = data.views_count === null ? update.is('views_count', null) : update.eq('views_count', current);
    const { data: rows, error: updateError } = await update.select('id');
    if (updateError) return false;
    if (rows && rows.length > 0) return true;
  }
  return false;
}
