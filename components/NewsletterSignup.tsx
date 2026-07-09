'use client';

import { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { trackSignUp } from '@/lib/analytics';

export default function NewsletterSignup({ source = 'article' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      // sign_up, not generate_lead - leads mean therapy inquiries only
      trackSignUp(source);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error && err.message !== 'failed' ? err.message : 'ההרשמה נכשלה, נסו שוב');
    }
  }

  if (status === 'done') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center my-10">
        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" aria-hidden="true" />
        <p className="text-stone-800 font-semibold">נרשמתם בהצלחה!</p>
        <p className="text-stone-600 text-sm mt-1">מאמר חדש - ישר למייל שלכם.</p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 my-10">
      <div className="flex items-center gap-3 mb-3">
        <Mail className="w-6 h-6 text-amber-700" aria-hidden="true" />
        <h3 className="text-xl font-bold text-stone-800">רוצים לקבל מאמר חדש למייל?</h3>
      </div>
      <p className="text-stone-600 mb-4">
        הצטרפו לרשימת התפוצה וקבלו כלים מעשיים להורות, זוגיות ורווחה רגשית - בלי ספאם.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        {/* Honeypot */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <label htmlFor="newsletter-email" className="sr-only">
          כתובת אימייל
        </label>
        <input
          id="newsletter-email"
          type="email"
          dir="ltr"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-400 focus:outline-none text-left"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="min-h-[44px] bg-stone-800 hover:bg-stone-900 text-white px-6 py-2 rounded-xl font-semibold transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          הרשמה
        </button>
      </form>
      {status === 'error' && (
        <p role="alert" className="text-red-600 text-sm mt-2">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
