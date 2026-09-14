-- Returning visitors, counted in the browser and never from an IP.
--
-- WHY. Every figure on the dashboard takes a visit as the unit, so it cannot
-- tell forty people who came once from ten who came four times. On a site
-- whose enquiry is a phone call to a therapist that gap is the whole question:
-- almost nobody writes on the first visit, and until now there was no way to
-- see whether the second visit was happening at all.
--
-- WHY NOT IP. It was the obvious answer and it is the wrong one. 76% of this
-- site's traffic is mobile, where carrier-grade NAT puts thousands of people
-- behind one address; home addresses are dynamic; one household is one
-- address; iCloud Private Relay moves the address between requests. So the
-- identification would be both wrong and, on a psychotherapist's site, an
-- address plus a path plus a timestamp is a record of somebody's state of
-- mind. Not stored, and the closing line of the dashboard still says so.
--
-- WHAT IS STORED INSTEAD. A counter in the visitor's own localStorage
-- (lib/visitor.ts): an integer that starts at 1 and a first-seen timestamp,
-- both scoped to that browser, both reset after 90 days of absence - the same
-- window the attribution already uses - and both erased by clearing the
-- browser. Nothing is written that could identify anyone, and the counter can
-- be read and deleted by the person it describes, which an IP cannot.
--
-- THE BUG THIS ALSO FIXES. identifyVisitorType() has kept a visit_count in
-- localStorage all along, and it was wrong twice over: it was called from an
-- effect keyed on `pathname`, so it counted a page, not a visit - somebody who
-- read three articles in one sitting was recorded as being on their third
-- visit - and it was handed to GA4 through setUserProperty() and nowhere else,
-- so this dashboard never saw it. The counter now increments once per tab
-- session (a sessionStorage flag) and rides along with every tracked event.
--
-- NO BACKFILL IS POSSIBLE. Nothing about a browser was stored before today, so
-- every existing row keeps visit_number null. The dashboard card reports what
-- it is measured on out of the range total rather than filling the gap with a
-- guess, and stays quiet until there is something true to say.

alter table public.site_events
  add column if not exists visit_number     integer,
  add column if not exists days_since_first integer;

comment on column public.site_events.visit_number is
  'Which visit this is for this browser, 1 on the first. Counted in localStorage by lib/visitor.ts, never from an IP, and reset after 90 days of absence. NULL for rows predating the column or where storage was unavailable.';
comment on column public.site_events.days_since_first is
  'Whole days between this browser first visiting and this event. 0 on the first day.';

-- manage_analytics gained three keys, added in place with the
-- pg_get_functiondef + replace() pattern so the 13KB body was not retyped and
-- a drifted source would have aborted instead of overwriting:
--
--   returning             - new / returning / loyal visits, enquiries on each
--                           side, and the MEDIAN visit and day at which an
--                           enquiry arrives. Median, not mean: one person who
--                           came back eleven times before writing would drag a
--                           mean past anything true about the rest.
--   returning_buckets     - the same split as 1 / 2-3 / 4-9 / 10+, for the bar.
--   engagement_by_source  - pages per visit, one-page visits and deep visits
--                           per traffic group. The dashboard ranked sources by
--                           volume, which is the one measure on which a paid
--                           click and a search arrival look identical. In the
--                           30 days to 2026-09-14: organic 3.78 pages a visit
--                           against 1.53 for Google Ads.
--
-- The session-level CTE picks the counter up with max(), because it is
-- constant within a session and null on any event written before the column
-- existed. Bots were already excluded upstream, so none of this counts them.
