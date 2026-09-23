-- Somewhere to put a row that is taken out of site_events.
--
-- The dashboard reported 17 enquiries. Five of them were one desktop session
-- between 22 and 24 August: 73 events, 61 page views, 14 pages including all
-- seven service pages, and the very first row ever written to the table. It
-- produced a contact form submit that left no row in contact_messages, and
-- four clicks on the email link inside 28 seconds. The second-largest session
-- on the site is 17 events. It was the owner walking the site after launch,
-- and it was inflating views, visits, article reads and - the number that
-- matters - enquiries.
--
-- bot_kind exists so a crawler can be labelled rather than turned away, and
-- that is the right shape for a machine. It is the wrong shape here: the owner
-- is not a bot kind, and inventing one would put a person in a column that
-- promises it holds none.
--
-- So the rows come out, and they come here. "Delete the owner's test traffic"
-- and "lose the evidence that it was test traffic" are not the same
-- instruction, and a deletion nobody can audit is not a cleanup, it is a
-- number that changed for reasons no one can check. Every row keeps its
-- original id and a sentence saying why it was removed.
--
-- Nothing reads this table. manage_analytics and manage_article_engagement
-- query site_events only, so an archived row is gone from every figure on the
-- dashboard - which is the whole point - and recoverable with one insert.

create table if not exists public.site_events_archive (
  like public.site_events,
  archived_at timestamptz not null default now(),
  reason      text        not null
);

comment on table public.site_events_archive is
  'Rows removed from site_events, kept verbatim with their original id so a removal can be undone or audited. Nothing reads it: manage_analytics and manage_article_engagement query site_events only, so an archived row is gone from every figure on the dashboard. It exists because "delete the owner test traffic" and "lose the evidence that it was test traffic" are not the same instruction.';

comment on column public.site_events_archive.reason is
  'Why the row was taken out, in a sentence. Written at archive time - a row with no reason cannot be judged later.';

-- Same posture as site_events: RLS on with no policies, so only the service
-- role reaches it. A table holding a copy of analytics rows must not be
-- readable by anon through PostgREST just because it is new.
alter table public.site_events_archive enable row level security;

-- The move itself, run once on 2026-09-23. Kept here as the record of what was
-- taken out and on whose say-so, not as something to run again - the insert is
-- not idempotent and the session is already gone.
--
--   insert into public.site_events_archive
--   select e.*, now(), '<the sentence above>'
--   from site_events e where e.session_id = '1bqdwzt88i3mt4isnkq';
--
--   delete from site_events where session_id = '1bqdwzt88i3mt4isnkq';
--
-- Verified before the delete: 73 rows in, 73 rows archived, zero rows in
-- either direction of an EXCEPT between them. After: 1187 events left, and 12
-- enquiries across 12 distinct sessions - so every enquiry now on record is a
-- different person. All four contact_email clicks belonged to that session,
-- which is why the email channel now reads zero and should.

-- Second move, same day, same method: session hwvxozratumtjoqlo8, 10 rows.
--
-- 2 September was the only day that ever showed three enquiries, and one of
-- them was Nira. The session is the visit that POSTED an article to Facebook -
-- a share fired from it at 08:58:32 with an internal referrer, and nine
-- Facebook sessions landed on that exact article between 08:59 and 09:08.
-- Forty-eight minutes later the same session walked the service pages, tapped
-- the phone number, and reloaded /services/adult-therapy three times in thirty
-- seconds. That is someone checking a site, not someone choosing a therapist,
-- and the owner confirmed whose it was.
--
-- It also held one of the four shares on record, so the share count is now 3.
-- That is the correct number: a share by the author is a publication, not a
-- reader passing an article on, and the card that counts shares is about
-- readers.
--
-- Verified the same way, and after it: 2 September reads 2 enquiries, and the
-- site total is 12 - eleven survivors plus one that arrived from Google Ads
-- while the removal was being made.
