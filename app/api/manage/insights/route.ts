import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// What the site is actually doing, built only from data this project owns.
//
// Note on pageviews: articles.views_count is a running counter with no
// per-view timestamp, so it can be totalled and ranked but not charted over
// time. Anything time-based below comes from rows that do carry a date -
// leads, subscribers, comments, published articles. A real traffic graph
// would need the GA4 Data API and a service account.
export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = supabaseServer();
  const since = (days: number) =>
    new Date(Date.now() - days * 86400_000).toISOString();
  const d30 = since(30);
  const d60 = since(60);

  const count = (q: PromiseLike<{ count: number | null }>) =>
    Promise.resolve(q).then((r) => r.count || 0);

  try {
    const [
      articles,
      leads30,
      leadsPrev30,
      subs30,
      subsPrev30,
      comments30,
      published30,
      leadRows,
    ] = await Promise.all([
      supabase
        .from('articles')
        .select('id, title, slug, views_count, likes_count')
        .eq('is_published', true)
        .order('views_count', { ascending: false })
        .then((r) => r.data || []),
      count(
        supabase.from('contact_messages').select('*', { count: 'exact', head: true })
          .gte('created_date', d30),
      ),
      count(
        supabase.from('contact_messages').select('*', { count: 'exact', head: true })
          .gte('created_date', d60).lt('created_date', d30),
      ),
      count(
        supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true })
          .gte('created_at', d30),
      ),
      count(
        supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true })
          .gte('created_at', d60).lt('created_at', d30),
      ),
      count(
        supabase.from('comments').select('*', { count: 'exact', head: true })
          .gte('created_date', d30),
      ),
      count(
        supabase.from('articles').select('*', { count: 'exact', head: true })
          .eq('is_published', true).gte('created_date', d30),
      ),
      supabase
        .from('contact_messages')
        .select('status, channel, created_date')
        .gte('created_date', d30)
        .then((r) => r.data || []),
    ]);

    const totalViews = articles.reduce((s, a) => s + (a.views_count || 0), 0);
    const totalLikes = articles.reduce((s, a) => s + (a.likes_count || 0), 0);

    // Which lifecycle stage the last 30 days of leads reached
    const byStatus: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    for (const l of leadRows as Array<{ status?: string; channel?: string }>) {
      const s = l.status || 'new';
      byStatus[s] = (byStatus[s] || 0) + 1;
      if (l.channel) byChannel[l.channel] = (byChannel[l.channel] || 0) + 1;
    }

    return NextResponse.json({
      totalViews,
      totalLikes,
      publishedCount: articles.length,
      leads30,
      leadsPrev30,
      subs30,
      subsPrev30,
      comments30,
      published30,
      byStatus,
      byChannel,
      top: articles.slice(0, 5).map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        views: a.views_count || 0,
        likes: a.likes_count || 0,
      })),
      // No article has ever been viewed if this is 0 - worth saying plainly
      // rather than drawing an empty chart.
      hasViewData: totalViews > 0,
    });
  } catch (e) {
    console.error('manage insights failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
