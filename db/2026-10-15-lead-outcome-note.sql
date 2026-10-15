-- A few words from Nira on how an enquiry ended, written on /manage/update
-- right after she taps "קבענו טיפול" or "לא רלוונטי".
--
-- Kept apart from `message`, which is what the person wrote and must stay as
-- they wrote it. For an irrelevant lead this is the reason, which is what lets
-- the growth reports say WHY enquiries are not relevant (wrong service, price,
-- location...) without anyone reading the enquiries themselves.
--
-- Nullable, no default: existing rows are unaffected. contact_messages stays
-- RLS-locked; the note is read and written only through /api/manage/contacts
-- with the service-role key, like the rest of the row.

alter table public.contact_messages
  add column if not exists outcome_note text;
