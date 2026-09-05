import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { syncIndexNow } from '@/lib/indexnowSync';

export const runtime = 'nodejs';

// Daily at 06:00 (vercel.json). Two jobs, both "content changed, tell someone":
//
//  1. Publish articles whose scheduled_publish_at has passed.
//  2. Ping IndexNow for anything that changed since the last run.
//
// The second one runs whether or not the first published anything, and that is
// the point. Articles are published from /manage straight against Supabase,
// with no deploy and no server route to hook, so the build-time submission
// cannot see them. This is what catches those - within a day, without adding a
// second cron or a write path that did not exist before.
export async function GET(_request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const now = new Date().toISOString();

  const { data: due, error: fetchError } = await supabase
    .from('articles')
    .select('id, slug, title')
    .eq('is_published', false)
    .not('scheduled_publish_at', 'is', null)
    .lte('scheduled_publish_at', now);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (due?.length) {
    const { error: updateError } = await supabase
      .from('articles')
      .update({ is_published: true, updated_date: now })
      .in('id', ids(due));

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Never fatal: a failed search-engine ping must not turn a successful
  // publish into a 500 that the cron will retry.
  let indexnow: unknown = null;
  try {
    const report = await syncIndexNow(supabase);
    indexnow = {
      changed: report.changed.length,
      recorded: report.recorded,
      reason: report.reason,
      statuses: report.result?.batches.map((b) => b.status),
      errors: report.errors,
    };
  } catch (err) {
    indexnow = { error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({
    published: (due || []).map((a) => ({ id: a.id, slug: a.slug, title: a.title })),
    count: due?.length || 0,
    indexnow,
  });
}

const ids = (rows: Array<{ id: string }>) => rows.map((a) => a.id);
