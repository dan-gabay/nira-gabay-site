import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// Resolves a pending tap recorded by app/api/contact-intent/route.ts.
//
// Every tap on WhatsApp, phone or email writes one row and then waits for the
// only judgement the site cannot make for itself: whether a message actually
// arrived. That answer lives on Nira's phone.
//
// "It arrived" is not handled here - it goes through POST /api/manage/contacts
// with intent_id, because it produces a lead and a lead needs a name. This
// route handles the other answer, which needs nothing but one tap of its own,
// and the undo for when it was the wrong one.
//
// The row is never deleted. Taps that produced no message are the denominator
// of the button-to-conversation rate, which is the difference between what
// Google Ads counts as a conversion and what Nira actually received.

async function unauthorized(req: NextRequest): Promise<boolean> {
  return !(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value));
}

export async function PATCH(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: number; dismissed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  if (
    typeof body.id !== 'number' ||
    !Number.isFinite(body.id) ||
    typeof body.dismissed !== 'boolean'
  ) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('contact_intents')
    .update({ dismissed_at: body.dismissed ? new Date().toISOString() : null })
    .eq('id', Math.round(body.id))
    // A tap already logged as a lead is settled; dismissing it would hide a
    // real enquiry's attribution from the list it was claimed onto.
    .is('claimed_by', null);

  if (error) {
    console.error('manage contact intent update failed:', error.message);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
