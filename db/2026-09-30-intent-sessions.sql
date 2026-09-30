-- The site visit behind each pending tap on WhatsApp/phone/email, so the
-- "הגיע" lead form in /manage/contacts can show the visitor's journey while
-- Nira is logging the lead. Same match as manage_lead_sessions
-- (db/2026-09-28-lead-sessions.sql): the conversion event of the same channel
-- nearest the tap, within two minutes.
create or replace function public.manage_intent_sessions()
returns json
language sql
security definer
set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object('id', i.id, 'session_id', s.session_id)), '[]'::json)
  from contact_intents i
  cross join lateral (
    select e.session_id
      from site_events e
     where e.is_conversion
       and e.bot_kind is null
       and e.session_id is not null
       and e.event_name = case i.channel
                            when 'whatsapp' then 'contact_whatsapp'
                            when 'phone'    then 'contact_phone'
                            when 'email'    then 'contact_email'
                          end
       and e.created_at between i.created_at - interval '2 minutes' and i.created_at + interval '2 minutes'
     order by abs(extract(epoch from e.created_at - i.created_at))
     limit 1
  ) s
  where i.claimed_by is null
    and i.dismissed_at is null
    and i.created_at >= now() - interval '90 days'
$$;

revoke all on function public.manage_intent_sessions() from public, anon, authenticated;
