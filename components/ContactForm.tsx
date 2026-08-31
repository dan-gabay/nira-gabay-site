'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import {
  trackContactFormSubmit,
  trackFormFieldFocus,
  trackGenerateLead,
} from '@/lib/analytics';
import { getStoredAttribution } from '@/lib/attribution';

type ContactFormProps = {
  // Where the form lives, for analytics + lead attribution
  // (e.g. 'contact_page', 'service_parent_guidance').
  sourceId: string;
  title?: string;
  subtitle?: string;
};

// The contact form card, shared by /contact and the service landing pages.
// On submit it attaches the visitor's stored attribution (utm/gclid/landing
// page) plus the page the form was submitted from.
export default function ContactForm({
  sourceId,
  title = 'שלחו הודעה',
  subtitle = 'אענה בהקדם האפשרי',
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const honeypotId = `contact-website-${sourceId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.message || !formData.phone) {
      setError('נא למלא שם, טלפון והודעה');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const honeypot = (document.getElementById(honeypotId) as HTMLInputElement | null)?.value || '';
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          website: honeypot,
          attribution: {
            ...(getStoredAttribution() || {}),
            source_page: window.location.pathname,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'submit failed');
      }

      // Track conversion with GA4 recommended event
      trackContactFormSubmit(sourceId);
      trackGenerateLead('contact_form', 100); // GA4 recommended event

      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      console.error('Form submission error:', err);
      setError('לא הצלחנו לשלוח את ההודעה. אנא נסו שוב או צרו קשר ישירות בטלפון/WhatsApp.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-5 md:p-10">
      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 md:py-12"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
          </div>
          <h3 className="text-lg md:text-2xl font-bold text-stone-800 mb-3 md:mb-4">תודה על פנייתכם!</h3>
          <p className="text-sm md:text-base text-stone-600 mb-5 md:mb-6">קיבלתי את ההודעה ואחזור אליכם בהקדם האפשרי.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-6 min-h-[44px] border border-stone-200 rounded-lg hover:bg-stone-50 text-sm md:text-base transition-colors"
          >
            שליחת הודעה נוספת
          </button>
        </motion.div>
      ) : (
        <>
          <h2 className="text-lg md:text-2xl font-bold text-stone-800 mb-1.5 md:mb-2">{title}</h2>
          <p className="text-sm md:text-base text-stone-500 mb-6 md:mb-8">{subtitle}</p>

          {error && (
            <div className="mb-4 md:mb-6 p-3.5 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs md:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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
              <label htmlFor={`contact-name-${sourceId}`} className="block text-xs md:text-sm font-medium text-stone-700 mb-1.5 md:mb-2">
                שם מלא *
              </label>
              <input
                data-clarity-mask="true"
                id={`contact-name-${sourceId}`}
                type="text"
                placeholder="השם שלכם"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onFocus={() => trackFormFieldFocus('contact_form', 'name')}
                className="w-full px-3.5 md:px-4 py-2.5 md:py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label htmlFor={`contact-email-${sourceId}`} className="block text-xs md:text-sm font-medium text-stone-700 mb-1.5 md:mb-2">
                  אימייל
                </label>
                <input
                  data-clarity-mask="true"
                  id={`contact-email-${sourceId}`}
                  type="email"
                  dir="ltr"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => trackFormFieldFocus('contact_form', 'email')}
                  className="w-full px-3.5 md:px-4 py-2.5 md:py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-amber-500 text-left"
                />
              </div>
              <div>
                <label htmlFor={`contact-phone-${sourceId}`} className="block text-xs md:text-sm font-medium text-stone-700 mb-1.5 md:mb-2">
                  טלפון *
                </label>
                <input
                  data-clarity-mask="true"
                  id={`contact-phone-${sourceId}`}
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="050-0000000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onFocus={() => trackFormFieldFocus('contact_form', 'phone')}
                  className="w-full px-3.5 md:px-4 py-2.5 md:py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-amber-500 text-left"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor={`contact-message-${sourceId}`} className="block text-xs md:text-sm font-medium text-stone-700 mb-1.5 md:mb-2">
                הודעה *
              </label>
              <textarea
                data-clarity-mask="true"
                id={`contact-message-${sourceId}`}
                placeholder="במה אוכל לעזור?"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                onFocus={() => trackFormFieldFocus('contact_form', 'message')}
                className="w-full px-3.5 md:px-4 py-2.5 md:py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-24 md:min-h-32"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-stone-800 hover:bg-stone-900 text-white py-3 md:py-4 rounded-lg text-sm md:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                  שליחה
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
