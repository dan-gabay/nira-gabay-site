-- Which visit each lead in /manage/contacts came from, so a lead can open the
-- same "whole story" panel as a row in "הפניות עצמן" (see
-- db/2026-09-28-enquiry-journey.sql). Returns [{id, session_id}].
--
-- A lead never stored its visit, so it is matched by time:
--   - the anchor is the tap the lead was logged from (contact_intents with
--     claimed_by = the lead), or, for a site form, the lead's own creation
--     time - the form writes it the moment it is sent;
--   - the visit is the one whose enquiry event of the same channel is closest
--     to that anchor, within two minutes.
-- A lead typed in by hand with no tap behind it has no anchor and no visit.
-- On the data of 2026-09-28 every one of the five leads that have an anchor
-- matched exactly one event.

create or replace function public.manage_lead_sessions()
returns json
language sql
security definer
set search_path to 'public'
as $$
  with a as (
    select
      m.id,
      coalesce(m.channel, 'form') as channel,
      coalesce(
        (select min(i.created_at) from contact_intents i where i.claimed_by = m.id),
        case when coalesce(m.channel, 'form') = 'form' then m.created_date end
      ) as at
    from contact_messages m
  )
  select coalesce(json_agg(json_build_object('id', a.id, 'session_id', s.session_id)), '[]'::json)
  from a
  cross join lateral (
    select e.session_id
      from site_events e
     where e.is_conversion
       and e.bot_kind is null
       and e.session_id is not null
       and e.event_name = case a.channel
                            when 'whatsapp' then 'contact_whatsapp'
                            when 'phone'    then 'contact_phone'
                            when 'email'    then 'contact_email'
                            when 'form'     then 'contact_form_submit'
                          end
       and e.created_at between a.at - interval '2 minutes' and a.at + interval '2 minutes'
     order by abs(extract(epoch from e.created_at - a.at))
     limit 1
  ) s
  where a.at is not null
$$;

revoke all on function public.manage_lead_sessions() from public, anon, authenticated;
