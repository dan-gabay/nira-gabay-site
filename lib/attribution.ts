// Lead attribution capture: which campaign/page/source brought the visitor
// who eventually submits the contact form. Stored client-side (localStorage,
// 90 days - the validity window of a Google Ads click ID) and sent with the
// form submission to be saved on the contact_messages row.
//
// Model: "last non-direct click wins" - a visit that arrives with utm_* or
// gclid params overwrites whatever was stored; an organic/direct visit only
// fills the slot if it's empty. Nothing here is ever sent to ad platforms -
// it only travels with the lead into our own Supabase table.

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  landing_page: string | null;
  referrer: string | null;
};

const STORAGE_KEY = 'lead_attribution_v1';
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const MAX_LEN = 200;

type StoredAttribution = Attribution & { captured_at: number };

const clip = (v: string | null): string | null =>
  v ? v.slice(0, MAX_LEN) : null;

function readStored(): StoredAttribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (!parsed.captured_at || Date.now() - parsed.captured_at > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Call once per full page load (i.e., the start of a visit).
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromParams: Attribution = {
      utm_source: clip(params.get('utm_source')),
      utm_medium: clip(params.get('utm_medium')),
      utm_campaign: clip(params.get('utm_campaign')),
      utm_term: clip(params.get('utm_term')),
      utm_content: clip(params.get('utm_content')),
      gclid: clip(params.get('gclid')),
      landing_page: clip(window.location.pathname),
      referrer: clip(document.referrer || null),
    };

    const isTagged = !!(fromParams.gclid || fromParams.utm_source || fromParams.utm_medium || fromParams.utm_campaign);
    const existing = readStored();

    // Tagged visits always win; untagged visits only fill an empty slot.
    if (!isTagged && existing) return;

    const record: StoredAttribution = { ...fromParams, captured_at: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable (private mode etc.) - attribution is best-effort
  }
}

// Read attribution to attach to a lead submission.
export function getStoredAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  const stored = readStored();
  if (!stored) return null;
  const { captured_at: _ignored, ...attribution } = stored;
  return attribution;
}
