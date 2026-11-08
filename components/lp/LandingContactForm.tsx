'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Send, Loader2, CheckCircle, MessageCircle, Check } from 'lucide-react';
import {
  trackContactFormSubmit,
  trackFormFieldFocus,
  trackGenerateLead,
  trackWhatsAppClick,
  reportSiteError,
} from '@/lib/analytics';
import { getStoredAttribution } from '@/lib/attribution';
import { clarityEvent } from '@/lib/clarity';
import { isValidIsraeliPhone, PHONE_ERROR } from '@/lib/phone';
import { LP_FORM, LP_INTRO_CALL } from '@/lib/landing/adultTherapy';

const FIELD =
  // text-base at every width: iOS Safari zooms into any focused field under
  // 16px (same rule as components/ContactForm.tsx).
  'w-full px-3.5 md:px-4 py-2.5 md:py-3 border rounded-lg text-base bg-stone-50 border-stone-200 ' +
  'text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600';

/**
 * The landing page's short form: name, phone and an optional message.
 *
 * Posts to the same /api/contact as every other form on the site, which has
 * required only name and phone since the message became optional - so there is
 * no server change and no parallel backend. The lead is told apart in /manage
 * by attribution.source_page (/lp/adult-therapy), saved on the row as before.
 *
 * Conversions fire exactly as on the control page (components/ContactForm.tsx):
 * contact_form_submit + generate_lead, and only after the server answered OK,
 * so A and B report the primary conversion the same way. Nothing the visitor
 * typed is sent to any analytics tool.
 *
 * Copy is the approved landing copy (lib/landing/adultTherapy.ts); the
 * success, required-fields and failure messages are the ones ContactForm
 * already shows, so the site says the same thing everywhere.
 */
export default function LandingContactForm({
  sourceId,
  waHref,
  waSource = 'lp_adult_hero_form',
}: {
  sourceId: string;
  waHref: string;
  /** Label for the WhatsApp click event under the form. */
  waSource?: string;
}) {
  const [formData, setFormData] = useState({ name: '', phone: '', message: '' });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // A ref, not only state: two taps inside the same frame both see the old
  // isLoading value, and the second would post the lead again.
  const inFlight = useRef(false);
  const thanksRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submitted) thanksRef.current?.focus();
  }, [submitted]);

  // Field ids come from useId, not sourceId: a page may render the form twice
  // (one copy for phones, one for desktop, only one visible), and ids must
  // stay unique in the document.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const honeypotId = `lp-website-${uid}`;
  const phoneInvalid = phoneTouched && !!formData.phone && !isValidIsraeliPhone(formData.phone);

  const fail = (message: string) => {
    setError(message);
    clarityEvent('form_error');
    // Move focus to the message so it is announced and visible on a phone,
    // where the keyboard may be covering it.
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;

    if (!formData.name.trim() || !formData.phone.trim()) {
      fail('נא למלא שם וטלפון');
      return;
    }
    if (!isValidIsraeliPhone(formData.phone)) {
      setPhoneTouched(true);
      fail(PHONE_ERROR);
      reportSiteError('contact_form', 'phone_rejected_client');
      return;
    }

    inFlight.current = true;
    setIsLoading(true);
    setError('');

    let status: number | null = null;
    try {
      const honeypot =
        (document.getElementById(honeypotId) as HTMLInputElement | null)?.value || '';
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          message: formData.message,
          website: honeypot,
          attribution: {
            ...(getStoredAttribution() || {}),
            source_page: window.location.pathname,
          },
        }),
      });
      status = res.status;
      if (!res.ok) throw new Error('submit failed');

      // Server confirmed the lead was saved: only now is it a conversion.
      trackContactFormSubmit(sourceId);
      trackGenerateLead('contact_form', 100);

      setSubmitted(true);
      setFormData({ name: '', phone: '', message: '' });
      setPhoneTouched(false);
    } catch {
      // Same split as ContactForm: 400/500 are recorded by the route itself.
      if (status === null) reportSiteError('contact_form', 'network');
      else if (status !== 400 && status !== 500) reportSiteError('contact_form', `http_${status}`);
      fail('לא הצלחנו לשלוח את ההודעה. אנא נסו שוב או צרו קשר ישירות בטלפון/WhatsApp.');
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div role="status" className="text-center py-6 md:py-10">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 md:w-8 md:h-8 text-emerald-700" aria-hidden="true" />
        </div>
        <h3
          ref={thanksRef}
          tabIndex={-1}
          className="text-lg md:text-2xl font-bold text-stone-800 mb-2 focus:outline-none"
        >
          תודה על פנייתכם!
        </h3>
        <p className="text-sm md:text-base text-stone-600 mb-5">
          קיבלתי את ההודעה ואחזור אליכם בהקדם האפשרי.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="px-6 min-h-[44px] border border-stone-200 rounded-lg hover:bg-stone-50 text-sm md:text-base transition-colors"
        >
          שליחת הודעה נוספת
        </button>
      </div>
    );
  }

  const labelCls = 'block text-sm font-medium text-stone-700 mb-1.5';

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-stone-800 mb-1.5">{LP_FORM.title}</h2>
      <p className="inline-flex items-center gap-1.5 text-sm md:text-[0.9375rem] font-medium text-emerald-800 mb-4 md:mb-5">
        <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        {LP_INTRO_CALL}
      </p>

      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm focus:outline-none"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-3.5 md:space-y-4" aria-busy={isLoading}>
        {/* Honeypot - hidden from real users */}
        <input
          type="text"
          id={honeypotId}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <div>
          <label htmlFor={`lp-name-${uid}`} className={labelCls}>
            {LP_FORM.nameLabel} <span aria-hidden="true">*</span>
          </label>
          <input
            data-clarity-mask="true"
            id={`lp-name-${uid}`}
            name="name"
            type="text"
            autoComplete="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onFocus={() => trackFormFieldFocus('contact_form', 'name')}
            className={FIELD}
            required
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor={`lp-phone-${uid}`} className={labelCls}>
            {LP_FORM.phoneLabel} <span aria-hidden="true">*</span>
          </label>
          <input
            data-clarity-mask="true"
            id={`lp-phone-${uid}`}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            dir="ltr"
            placeholder="050-0000000"
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              if (phoneTouched) setPhoneTouched(false);
            }}
            onFocus={() => trackFormFieldFocus('contact_form', 'phone')}
            onBlur={() => setPhoneTouched(true)}
            aria-invalid={phoneInvalid}
            aria-describedby={phoneInvalid ? `lp-phone-help-${uid}` : undefined}
            className={`${FIELD} text-left ${phoneInvalid ? 'ring-2 ring-red-400 focus:ring-red-400' : ''}`}
            required
            aria-required="true"
          />
          {phoneInvalid && (
            <p id={`lp-phone-help-${uid}`} className="mt-1.5 text-xs text-red-700">
              {PHONE_ERROR}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`lp-message-${uid}`} className={labelCls}>
            {LP_FORM.messageLabel}
          </label>
          <textarea
            data-clarity-mask="true"
            id={`lp-message-${uid}`}
            name="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            onFocus={() => trackFormFieldFocus('contact_form', 'message')}
            aria-describedby={`lp-micro-${uid}`}
            className={`${FIELD} min-h-20 md:min-h-24`}
          />
        </div>

        <p id={`lp-micro-${uid}`} className="text-xs md:text-sm text-stone-500">
          {LP_FORM.microcopy}
        </p>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-[48px] py-3 rounded-full text-base font-medium bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">שולח</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
              {LP_FORM.submit}
            </>
          )}
        </button>
      </form>

      <p className="mt-4 text-sm text-stone-600 text-center">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsAppClick(waSource)}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-emerald-800 underline underline-offset-4 hover:text-emerald-900"
        >
          <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {LP_FORM.whatsappAlt}
        </a>
      </p>
    </div>
  );
}
