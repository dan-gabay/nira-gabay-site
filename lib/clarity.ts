// Marks Clarity recordings with the steps that matter on the way to an
// enquiry, so the dashboard can filter to them, and tags each session with
// where it came from and what kind of page it is on.
//
// Only fixed labels are sent - never an enquiry id, name, phone, message or
// anything else that would tie a recording of a therapy site to a specific
// person in contact_messages. Matching a recording to one enquiry is
// deliberately not possible (owner decision, 2026-10-29).

import { CLARITY_ID } from './tagging';
import { isOptedOut } from './ownerOptOut';

type ClarityFn = ((command: string, ...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

function send(...args: unknown[]): void {
  if (typeof window === 'undefined' || !CLARITY_ID) return;
  // The same places the recorder itself stays out of (components/SiteChrome).
  if (window.location.pathname.startsWith('/manage') || isOptedOut()) return;
  try {
    // Clarity loads on lazyOnload, so a tap in the first second would find no
    // function yet. This is the stub its own snippet installs: calls queue up
    // and clarity.js replays them once it arrives.
    if (!window.clarity) {
      const stub: ClarityFn = (...a: unknown[]) => {
        (stub.q = stub.q || []).push(a);
      };
      window.clarity = stub;
    }
    window.clarity(...(args as [string, ...unknown[]]));
  } catch {
    // A blocked recorder must never break a CTA.
  }
}

export type ClarityStep =
  | 'cta_click'
  | 'form_start'
  | 'form_error'
  | 'contact_whatsapp'
  | 'contact_phone'
  | 'contact_email'
  | 'contact_form';

const sentOnce = new Set<ClarityStep>();

export function clarityEvent(name: ClarityStep): void {
  send('event', name);
}

/** For steps that repeat within a page (every field focus) but mean one thing. */
export function clarityEventOnce(name: ClarityStep): void {
  if (sentOnce.has(name)) return;
  sentOnce.add(name);
  send('event', name);
}

export function clarityTag(key: 'traffic' | 'page_type', value: string): void {
  send('set', key, value);
}

/** How this visit arrived, from the landing URL and referrer only. */
export function trafficType(search: string, referrer: string): string {
  const params = new URLSearchParams(search);
  const medium = (params.get('utm_medium') || '').toLowerCase();
  if (params.get('gclid') || params.get('gbraid') || params.get('wbraid') || medium === 'cpc' || medium === 'paid') {
    return 'paid';
  }
  let host = '';
  try {
    host = referrer ? new URL(referrer).hostname : '';
  } catch {
    host = '';
  }
  if (!host || host.endsWith('niragabay.com')) return medium ? 'campaign' : 'direct';
  if (/(^|\.)(google|bing|duckduckgo|yahoo|yandex)\./.test(host)) return 'organic';
  if (/(chatgpt|openai|perplexity|claude|gemini|copilot)/.test(host)) return 'ai';
  return 'referral';
}

export function pageType(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/services')) return 'service';
  if (pathname === '/articles') return 'articles';
  if (pathname.startsWith('/articles/')) return 'article';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/about')) return 'about';
  return 'other';
}
