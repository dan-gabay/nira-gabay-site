# GA4 Measurement Plan - niragabay.com

Property: `niragabay.com` (GA4 property `544891595`, measurement ID `G-5HBTQFQL05`,
account "Nira Gabay" / dangabay2@gmail.com, created 2026-07-09).
The previous tag (`G-9275H0XYFW`) pointed at a property outside the owner's
control; its data is unrecoverable. Reporting history starts 2026-07-09.

## 1. What the business needs to know

The site exists to (a) generate therapy / parent-guidance inquiries and
(b) build topical authority through the Hebrew article library. Everything we
measure serves four questions:

1. **Leads** - how many people took a contact action (form, WhatsApp, phone),
   and from which page/source?
2. **Acquisition** - which channels (organic, direct, social, referral) and
   which landing articles bring the sessions that convert?
3. **Content** - which articles actually get read (not just opened), which
   drive readers onward (internal links, hubs, newsletter), which are ignored?
4. **Funnel health** - do visitors move awareness (home/article) →
   consideration (about) → intent (contact), and where do they drop?

## 2. KPIs (the numbers that matter)

| KPI | Definition | Source |
|---|---|---|
| Leads / month | `generate_lead` + `contact_whatsapp` + `contact_phone` key events | key-event report |
| Lead conversion rate | key-event sessions / total sessions | default |
| Organic share of leads | key events segmented by session default channel group | default dimension |
| Engaged article reads | `article_read` count (30s+ or 50% scroll) | custom event |
| Article completion rate | `article_completed` / `article_read` per `article_id` | custom events + dimension |
| Newsletter signups | `sign_up` events | recommended event |
| Top converting content | pages in the conversion path of key events | GA4 attribution |

## 3. Event dictionary

Tier 1 - **key events** (marked as conversions in GA4; each is a distinct
event name because GA4 key events are per-name, not per-parameter):

| Event | Fires when | Params | Wired in |
|---|---|---|---|
| `generate_lead` | contact form submitted successfully | `lead_source`, `value` (100 ILS), `currency` | `app/contact/page.tsx` |
| `contact_whatsapp` | any WhatsApp link/button clicked | `event_label` (source location) | header, hero, contact, floating button, articles |
| `contact_phone` | phone number clicked | `event_label` (source location) | contact page, footer |
| `sign_up` | newsletter signup succeeded | `method: 'newsletter'`, `source` | `components/NewsletterSignup.tsx` |

Tier 2 - engagement (reported on, not conversions):
`article_read`, `article_completed`, `scroll` (percent_scrolled param - single
name, never `scroll_depth_25`-style dynamic names), `engagement_time`,
`share`, `search`, `select_content`, `view_item`, `contact_email`,
`booking_intent`, `funnel_progress`.

Tier 3 - diagnostics (kept for debugging, excluded from reports):
navigation clicks, form field focus, exit intent, CTA clicks, tag clicks.

Rules:
- **No dynamic event names.** Variability goes in parameters
  (`scroll` + `percent_scrolled: 75`, `time_milestone` + `minutes: 5`).
  GA4 fragments reports and caps distinct names; dynamic names are a bug.
- **`generate_lead` means a therapy lead.** Newsletter signups are `sign_up`;
  mixing them inflates the number Nira actually cares about.
- **One tracker per signal.** Scroll/engagement-time fire from
  `AnalyticsProvider` only; article components add article-specific events
  (`article_read`, `article_completed`) without re-firing generic scroll.

## 4. Custom dimensions (registered via `scripts/ga-setup.ts`)

GA4 ignores event params in reports unless registered. Event-scoped:
`lead_source`, `page_type`, `page_id`, `article_id`, `funnel_stage`,
`percent_scrolled`, `event_label`. User-scoped: `visitor_type`,
`engagement_level`. (Limits: 50 event-scoped, 25 user-scoped - we use 7 + 2.)

## 5. Property settings

- **Data retention: 14 months** (default is 2 - silently destroys
  year-over-year analysis; set by `scripts/ga-setup.ts`).
- **Google Signals: OFF.** Therapy-site visitors are a sensitive audience;
  do not feed ads personalization/remarketing. Leave off unless a deliberate
  decision is made otherwise.
- Timezone Israel, currency ILS (set at creation).
- Link Search Console (manual UI step: Admin → Product links → Search Console).

## 6. Operations

- `scripts/ga-auth.ts` - OAuth consent (`--edit` flag adds the Admin-API
  write scope needed once for setup; default is read-only for reporting).
- `scripts/ga-setup.ts` - idempotent property configuration: key events,
  custom dimensions, data retention. Re-run safely; it skips what exists.
- `scripts/ga-list-properties.ts` - find property IDs.
- `scripts/ga-query.ts [days] [dimensions] [metrics]` - ad-hoc reporting
  (GA4 Data API), same pattern as `scripts/gsc-query.ts` for Search Console.

Review cadence: monthly - leads by source, top read articles, funnel
drop-off; feed findings into the SEO backlog (`docs/seo-audit-2026-07.md`).
