import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// Every count the admin shell and dashboard need, in one authenticated call.
// contact_messages is RLS-locked (lead PII) so it can only be counted here,
// with the service-role key - and doing the rest alongside it saves the
// dashboard five separate round trips.
export async function GET(req: NextRequest) {
  if (!(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = supabaseServer();
  const count = (q: PromiseLike<{ count: number | null }>) =>
    Promise.resolve(q).then((r) => r.count || 0);

  try {
    const [
      newLeads,
      totalLeads,
      pendingComments,
      drafts,
      published,
      queuePending,
      subscribers,
    ] = await Promise.all([
      count(
        supabase
          .from('contact_messages')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false),
      ),
      count(supabase.from('contact_messages').select('*', { count: 'exact', head: true })),
      count(
        supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false),
      ),
      count(
        // Drafts means "awaiting a decision". Consolidated articles are parked
        // at status 'redirected': unpublished on purpose, never to be
        // republished, and kept only so their 301'd slug stays occupied.
        supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', false)
          .or('status.is.null,status.neq.redirected'),
      ),
      count(
        supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true),
      ),
      count(
        supabase
          .from('article_import_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ),
      count(supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true })),
    ]);

    return NextResponse.json({
      newLeads,
      totalLeads,
      pendingComments,
      drafts,
      published,
      queuePending,
      subscribers,
    });
  } catch (e) {
    console.error('manage summary failed:', e);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }
}
