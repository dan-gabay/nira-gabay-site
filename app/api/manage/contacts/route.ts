import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';

export const runtime = 'nodejs';

// contact_messages is RLS-locked (lead PII); all admin access goes through
// here with the service-role key. The proxy already gates /api/manage/*,
// the extra check below is defense in depth.
async function unauthorized(req: NextRequest): Promise<boolean> {
  return !(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value));
}

export async function GET(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_date', { ascending: false });

  if (error) {
    console.error('manage contacts list failed:', error.message);
    return NextResponse.json({ error: 'load failed' }, { status: 500 });
  }

  // Taps on WhatsApp/phone/email still awaiting an answer to the one question
  // only the owner can answer: did a message actually arrive. Pending means
  // neither logged as a lead nor dismissed. Bounded to 90 days because that is
  // how long a gclid stays usable, which is what these rows are for.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: intents, error: intentsError } = await supabase
    .from('contact_intents')
    .select('id, created_at, channel, source_page, device, utm_source, utm_medium, utm_campaign, utm_term, gclid, landing_page')
    .is('claimed_by', null)
    .is('dismissed_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);

  // A failure here must not cost the admin their lead list; the taps are an
  // aid to logging a lead, not the lead itself.
  if (intentsError) console.error('manage contact intents list failed:', intentsError.message);

  return NextResponse.json({ messages: data || [], intents: intents || [] });
}

const LEAD_STATUSES = ['new', 'spoke', 'started_therapy', 'ongoing', 'irrelevant'] as const;
const LEAD_CHANNELS = ['form', 'whatsapp', 'phone', 'email', 'other'] as const;

export async function PATCH(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    id?: string;
    is_read?: boolean;
    status?: string;
    heard_from?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.is_read === 'boolean') update.is_read = body.is_read;
  if (typeof body.status === 'string') {
    if (!(LEAD_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: 'bad status' }, { status: 400 });
    }
    update.status = body.status;
    update.status_updated_at = new Date().toISOString();
  }
  if (typeof body.heard_from === 'string') {
    update.heard_from = body.heard_from.slice(0, 200);
  }
  if (!body.id || Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('contact_messages')
    .update(update)
    .eq('id', body.id);

  if (error) {
    console.error('manage contacts update failed:', error.message);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Manual lead entry - most inquiries arrive by WhatsApp/phone and never
// touch the form; without this they'd be invisible to quality tracking.
export async function POST(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
    heard_from?: string;
    channel?: string;
    // The contact_intents row this enquiry came from, if the admin identified
    // it. Carries the campaign attribution onto the lead.
    intent_id?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  if (!name || !phone) {
    return NextResponse.json({ error: 'נא למלא שם וטלפון' }, { status: 400 });
  }
  const channel =
    body.channel && (LEAD_CHANNELS as readonly string[]).includes(body.channel)
      ? body.channel
      : 'other';

  const supabase = supabaseServer();

  // A hand-logged lead has no attribution of its own: Nira is transcribing a
  // WhatsApp message, not receiving a form post. If she identified the tap it
  // came from, its campaign fields are copied across - that copy is the whole
  // point of contact_intents, and what makes cost per qualified lead and
  // offline conversion import possible for WhatsApp enquiries.
  let attribution: Record<string, string | null> = {};
  let intentId: number | null = null;
  if (typeof body.intent_id === 'number' && Number.isFinite(body.intent_id)) {
    const { data: intent, error: intentError } = await supabase
      .from('contact_intents')
      .select('id, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, landing_page, referrer')
      .eq('id', Math.round(body.intent_id))
      .is('claimed_by', null)
      .maybeSingle();
    if (intentError) {
      console.error('manage contact intent read failed:', intentError.message);
    } else if (intent) {
      const { id, ...fields } = intent;
      intentId = id as number;
      attribution = fields as Record<string, string | null>;
    }
  }

  const leadId = crypto.randomUUID();
  const { error } = await supabase.from('contact_messages').insert([
    {
      id: leadId,
      name: name.slice(0, 200),
      phone: phone.slice(0, 50),
      email: (body.email || '').trim().slice(0, 200),
      message: (body.message || '').trim().slice(0, 5000),
      heard_from: (body.heard_from || '').trim().slice(0, 200) || null,
      channel,
      is_read: true, // Nira logs it herself - it's already "read"
      created_date: new Date().toISOString(),
      ...attribution,
    },
  ]);

  if (error) {
    console.error('manage contacts manual insert failed:', error.message);
    return NextResponse.json({ error: 'insert failed' }, { status: 500 });
  }

  // Marked only after the lead exists, so a failed insert leaves the tap
  // available to try again. `is('claimed_by', null)` keeps two admins racing on
  // the same tap from both claiming it.
  if (intentId !== null) {
    const { error: claimError } = await supabase
      .from('contact_intents')
      .update({ claimed_by: leadId })
      .eq('id', intentId)
      .is('claimed_by', null);
    if (claimError) console.error('manage contact intent claim failed:', claimError.message);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('manage contacts delete failed:', error.message);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
