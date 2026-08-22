import { whatsappHref } from './whatsapp';

// Shared look for the article index and the topic hubs: a deep teal ground
// with a mint accent, over the supplied leaf artwork.
export const TEAL_DARK = '#1A4A44';
export const MINT = '#3FC195';

// Both files already carry the leaf line-art and their own gradient, so they
// are used at full opacity with the solid colours as the paint-in layer.
export const ARTICLES_HERO_BG = '/images/articles-hero.webp';
export const ARTICLES_CTA_BG = '/images/articles-cta.webp';

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
