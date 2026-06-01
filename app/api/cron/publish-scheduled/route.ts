import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

  if (!due?.length) {
    return NextResponse.json({ published: [], count: 0 });
  }

  const ids = due.map((a) => a.id);

  const { error: updateError } = await supabase
    .from('articles')
    .update({ is_published: true, updated_date: now })
    .in('id', ids);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    published: due.map((a) => ({ id: a.id, slug: a.slug, title: a.title })),
    count: due.length,
  });
}
