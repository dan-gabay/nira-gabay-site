import type { MouseEvent } from 'react';

/** Marks each wrapper of a landing-page form (data-lp-form). */
export const LP_FORM_ATTR = 'data-lp-form';

/**
 * Click handler for every "jump to the form" link. A landing page renders the
 * form twice: inside the hero from lg up, and after "Meet Nira" on phones.
 * Only one is visible, so scroll to that one.
 *
 * Uses the browser's own smooth scrolling (scrollIntoView), not a JS
 * animation loop: native smooth scrolling runs off the main thread and works
 * with iOS Safari's collapsing toolbar, where a per-frame window.scrollTo
 * loop stutters ("jumps"). The stop position comes from the target's CSS
 * scroll-margin-top (clears the sticky header). prefers-reduced-motion gets
 * an instant jump. The href stays #contact-form (the phone copy) as the no-JS
 * fallback.
 */
export function scrollToVisibleLpForm(e: MouseEvent<HTMLAnchorElement>) {
  const forms = Array.from(document.querySelectorAll<HTMLElement>(`[${LP_FORM_ATTR}]`));
  const target = forms.find((el) => el.getClientRects().length > 0);
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
