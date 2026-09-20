// Israeli phone numbers: one definition, used by the public contact form, by
// the API route behind it, and by manual lead entry in /manage.
//
// Why this exists. The contact form asked for a phone and checked only that
// the field was not empty, so a lead arrived on 2026-09-18 with "50344242" -
// eight digits, no leading zero, one digit short of anything dialable. A
// phone number is the entire point of a lead for a practice that calls people
// back; an unreachable one is a lost client that still cost a click.
//
// The rules, as Israeli numbering actually works:
//
//   05X + 7 digits   mobile                     10 digits
//   07X + 7 digits   VoIP and other operators   10 digits
//   0X  + 7 digits   landline, X in 2,3,4,8,9    9 digits
//
// +972 and 00972 are accepted and folded back to the national 0 form, with or
// without the 0 the caller may have kept after the country code. Spaces,
// hyphens, dots and parentheses are all fine on the way in; what comes out is
// digits only, which is what wa.me needs and what makes two spellings of the
// same number comparable.
//
// Deliberately NOT validated: 1-800 and *XXXX service numbers, which nobody
// leaves as a callback number, and length-only guesses at foreign numbers -
// see normalizePhone for where those are allowed instead.

const MOBILE_OR_VOIP = /^0(5\d|7[2-9])\d{7}$/;
const LANDLINE = /^0[23489]\d{7}$/;

/** Digits only, with +972 / 00972 folded back to a leading 0. */
function toNationalDigits(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  // 00972... and 972... both mean the same thing. A real local number never
  // begins 972, because every area code starts with 0.
  if (d.startsWith('00972')) d = d.slice(5);
  else if (d.startsWith('972')) d = d.slice(3);
  else return d;
  // The caller may or may not have kept the national 0 after the country code.
  return d.startsWith('0') ? d : `0${d}`;
}

/**
 * Returns the number in national digits-only form (e.g. "0501234567"), or null
 * if it is not a phone number anyone could ring in Israel.
 */
export function normalizeIsraeliPhone(raw: string): string | null {
  const d = toNationalDigits(raw);
  if (MOBILE_OR_VOIP.test(d) || LANDLINE.test(d)) return d;
  return null;
}

/** True when the number is dialable in Israel. */
export function isValidIsraeliPhone(raw: string): boolean {
  return normalizeIsraeliPhone(raw) !== null;
}

/**
 * The same, but for numbers Nira types in herself from a message she has
 * already received. Israeli numbers are normalised as above; a number that
 * announces itself as foreign with a leading + is kept as given, because the
 * client is plainly reachable on it and refusing to record her would be the
 * worse error. Everything else is still rejected.
 */
export function normalizePhone(raw: string): string | null {
  const israeli = normalizeIsraeliPhone(raw);
  if (israeli) return israeli;

  const trimmed = (raw || '').trim();
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    // E.164 allows up to 15 digits; below 8 nothing is a real subscriber line.
    if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  }
  return null;
}

/**
 * The number in the form wa.me and tel: links want: country code, no plus, no
 * separators. Returns null for anything not dialable, so a caller can leave
 * the link out rather than build a broken one.
 */
export function toWhatsAppNumber(raw: string): string | null {
  const israeli = normalizeIsraeliPhone(raw);
  if (israeli) return `972${israeli.slice(1)}`;

  const other = normalizePhone(raw);
  return other && other.startsWith('+') ? other.slice(1) : null;
}

/**
 * What to tell someone whose number was rejected. Hebrew, and specific.
 *
 * The example carries no hyphens on purpose. The field is half-width, and in
 * an RTL line a hyphenated number is a break opportunity, so "050-1234567"
 * wrapped as "02-" then "1234567" and the message read as broken itself.
 */
export const PHONE_ERROR = 'מספר טלפון לא תקין. לדוגמה: 0501234567';
