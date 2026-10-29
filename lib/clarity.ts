// Marks a Clarity recording with what the visitor did, so the dashboard can
// filter to "sessions that ended in an enquiry" and show how people got there.
//
// Only the event name is sent - never an enquiry id, name, phone or anything
// else that would tie a recording of a therapy site to a specific person in
// contact_messages. Matching a recording to one enquiry is deliberately not
// possible (owner decision, 2026-10-29).

declare global {
  interface Window {
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

export function clarityEvent(name: string): void {
  // Undefined until Clarity loads (lazyOnload), on /manage and for the owner
  // opt-out. A tap before then simply goes unmarked.
  if (typeof window === 'undefined' || !window.clarity) return;
  try {
    window.clarity('event', name);
  } catch {
    // A blocked recorder must never break a CTA.
  }
}
