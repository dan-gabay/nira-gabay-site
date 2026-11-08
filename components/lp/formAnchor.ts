import type { MouseEvent } from 'react';

/** Marks each wrapper of a landing-page form (data-lp-form). */
export const LP_FORM_ATTR = 'data-lp-form';

/**
 * Click handler for "jump to the form" links. A landing page renders the form
 * twice: inside the hero from lg up, and lower down (after "Meet Nira") on
 * phones. Only one is visible, so scroll to that one. The href stays
 * #contact-form (the phone copy) as the no-JS fallback.
 */
export function scrollToVisibleLpForm(e: MouseEvent<HTMLAnchorElement>) {
  const forms = Array.from(document.querySelectorAll<HTMLElement>(`[${LP_FORM_ATTR}]`));
  const visible = forms.find((el) => el.getClientRects().length > 0);
  if (!visible) return;
  e.preventDefault();
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  visible.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
}
