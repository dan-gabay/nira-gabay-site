import { whatsappHref } from './whatsapp';

// Shared look for the article index and the topic hubs: a deep teal ground
// with a mint accent, over the supplied leaf artwork.
export const TEAL_DARK = '#1A4A44';
export const MINT = '#3FC195';
// MINT is too light for white text on it, or for text on white (about
// 2.3:1). Wherever a colour carries small text - the active chip, a text
// link, the light end of a gradient - use this darker emerald (5.5:1 with
// white, WCAG AA). MINT stays for large headings on TEAL_DARK and icons.
export const MINT_DARK = '#047857';

// Both files already carry the leaf line-art and their own gradient, so they
// are used at full opacity with the solid colours as the paint-in layer.
export const ARTICLES_HERO_BG = '/images/articles-hero.webp';
export const ARTICLES_CTA_BG = '/images/articles-cta.webp';
// Portrait crop of the same artwork, for the contact block on the service
// pages - that section is taller than wide, and the landscape files above
// crop badly into it.
export const FORM_BG = '/images/form-bg.webp';

// Re-exported from lib/whatsapp.ts, the single source for the number and the
// prefill text. Kept here so the existing imports keep working.
export const WA_HREF = whatsappHref();

// 40px on mobile keeps the chip row close to the design while still clearing
// the WCAG 2.5.8 target size; md and up gets the full 44px.
export const CHIP_BASE =
  'px-4 md:px-5 min-h-[40px] md:min-h-[44px] inline-flex items-center rounded-full text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors';
export const CHIP_IDLE =
  'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50';
export const CHIP_ACTIVE = 'text-white shadow-sm';

// "You are here" marker for the service-page tab row. Unlike the article
// filters (where CHIP_ACTIVE marks a toggle), this is the current page, so it
// must not look tappable: no fill or border, just bold emerald text with an
// underline. Rendered as a <span aria-current="page">, not a link.
export const CHIP_CURRENT =
  'px-1 min-h-[40px] md:min-h-[44px] inline-flex items-center text-xs md:text-sm font-bold whitespace-nowrap flex-shrink-0 text-emerald-700 shadow-[inset_0_-3px_0_#047857] cursor-default select-none';
