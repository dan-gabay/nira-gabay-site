import type { MouseEvent } from 'react';

/** Marks each wrapper of a landing-page form (data-lp-form). */
export const LP_FORM_ATTR = 'data-lp-form';

/** Scroll time for "jump to the form": quick, but visibly a scroll, not a jump. */
const DURATION_MS = 380;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Click handler for every "jump to the form" link. A landing page renders the
 * form twice: inside the hero from lg up, and after "Meet Nira" on phones.
 * Only one is visible, so scroll to that one, with a short eased animation
 * (native smooth scrolling is slower and its speed can't be set). Honours the
 * target's scroll-margin-top (clears the sticky header) and
 * prefers-reduced-motion (jumps instead). The href stays #contact-form (the
 * phone copy) as the no-JS fallback.
 */
export function scrollToVisibleLpForm(e: MouseEvent<HTMLAnchorElement>) {
  const forms = Array.from(document.querySelectorAll<HTMLElement>(`[${LP_FORM_ATTR}]`));
  const target = forms.find((el) => el.getClientRects().length > 0);
  if (!target) return;
  e.preventDefault();

  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const start = window.scrollY;
  const end = Math.max(0, start + target.getBoundingClientRect().top - margin);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(end - start) < 2) {
    window.scrollTo(0, end);
    return;
  }

  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / DURATION_MS);
    window.scrollTo(0, start + (end - start) * easeOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
