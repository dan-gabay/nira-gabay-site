-- Server-side record of a tap on WhatsApp, phone or email, with the ad click
-- that produced it.
--
-- Why this table exists. A lead that arrives through the contact form lands in
-- contact_messages carrying its gclid and utm_*, so the campaign that produced
-- it is knowable. A lead that arrives by WhatsApp carries nothing: the tap
-- hands the visitor to another app and leaves no row anywhere. Over the first
-- campaign period that was six of the eight contact events - the form was one
-- of them - so the attribution existed for about an eighth of the demand.
--
-- /manage already lets Nira log a WhatsApp lead by hand (POST
-- /api/manage/contacts), and that is the right place for it to stay: only she
-- knows whether a message actually arrived. But a hand-logged lead had no
-- attribution at all, so the two things that depend on it were impossible:
--
--   1. cost per QUALIFIED lead per ad group, which docs/google-ads-strategy-
--      2026-07.md §7 makes the day-60 and day-90 decision gate;
--   2. offline conversion import by gclid, which is what lets Google Ads
--      optimise toward "became a client" instead of "tapped a button".
--
-- This table is the missing half. Every tap writes its attribution here and
-- then shows up in /manage as one pending line, where the only question Nira
-- has to answer is the only one she can: did a message actually arrive.
--
--   no  -> dismissed_at is set, the line disappears, and the tap stands on
--          record as demand that did not convert.
--   yes -> the lead is logged and this row's campaign fields are copied onto
--          it, with claimed_by pointing at the contact_messages row.
--
-- A tap is therefore pending exactly while claimed_by and dismissed_at are
-- both null.
--
-- Privacy. No name, no phone, no message, no IP, no user agent string - a tap
-- is anonymous and there is nothing here to identify a person with. The one
-- exception is gclid, which identifies a CLICK on an ad rather than a person,
-- and which contact_messages already stores for exactly this purpose.
--
-- Note that site_events deliberately does NOT hold gclid ("the ad-click
-- identifier itself is never accepted or stored", app/api/track/route.ts).
-- That decision stands: site_events is behavioural analytics kept free of
-- identifiers. This is lead attribution, a different job with a different
-- lifetime, so it gets its own table rather than a column over there.

create table if not exists public.contact_intents (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),

  -- Which button. Allowlisted by the API route, not by a constraint, so a new
  -- channel does not need a migration.
  channel      text not null,
  -- The page the tap happened on, and the device it happened from.
  source_page  text,
  device       text,

  -- Attribution, as captured by lib/attribution.ts and carried in the
  -- visitor's own storage. Same column names as contact_messages so the copy
  -- on claim is a plain field-for-field assignment.
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  gclid        text,
  landing_page text,
  referrer     text,

  -- The contact_messages.id this tap was logged as, once Nira confirms the
  -- message arrived.
  claimed_by   text,
  -- Set when she confirms no message ever arrived. Kept rather than deleted:
  -- the ratio of taps to messages is the conversion step between a button and
  -- a conversation, and it cannot be measured if the misses are thrown away.
  dismissed_at timestamptz
);

comment on table public.contact_intents is
  'One row per tap on WhatsApp/phone/email, with its ad attribution. No PII. Claimed onto a contact_messages row when Nira confirms the enquiry arrived.';
comment on column public.contact_intents.claimed_by is
  'contact_messages.id this tap became. Null with dismissed_at null means still pending.';
comment on column public.contact_intents.dismissed_at is
  'When the owner confirmed no message arrived from this tap. Kept so tap-to-conversation rate stays measurable.';
comment on column public.contact_intents.gclid is
  'Google Ads click id. Identifies a click, not a person. Enables offline conversion import once the lead has a real outcome.';

-- The admin list reads pending taps newest first; the analytics side counts
-- taps per campaign over a window.
create index if not exists contact_intents_pending_idx
  on public.contact_intents (created_at desc)
  where claimed_by is null and dismissed_at is null;

create index if not exists contact_intents_created_idx
  on public.contact_intents (created_at desc);

-- Same posture as contact_messages, site_events and bot_hits: RLS on with no
-- policies, so only the service role reaches it. Every read and write goes
-- through a route that checks the manage cookie, except the public insert in
-- app/api/contact-intent/route.ts which uses the service role deliberately.
alter table public.contact_intents enable row level security;
