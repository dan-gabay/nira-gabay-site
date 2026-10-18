'use client';

import { useEffect } from 'react';
import { MessageCircle, Phone, RotateCcw } from 'lucide-react';
import { reportSiteError, trackWhatsAppClick, trackPhoneClick } from '@/lib/analytics';
import { whatsappHref } from '@/lib/whatsapp';
import { CLINIC } from '@/lib/clinic';

// Shown when a page fails to render. Before this file Next's bare default
// appeared - no way to reach Nira from it - and nothing recorded that it had
// happened. Now the failure goes to site_events (lib/siteEvents.ts,
// 'page_crash'), and the visitor still has the two ways in that cannot break.

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportSiteError('page_crash', 'render');
  }, []);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 py-12 md:py-24"
      style={{ paddingTop: '120px' }}
    >
      <div className="container mx-auto px-4 md:px-8 max-w-xl text-center">
        <h1 className="text-xl md:text-3xl font-bold text-stone-800 mb-3">משהו השתבש בטעינת העמוד</h1>
        <p className="text-stone-600 mb-8">אפשר לנסות שוב, או לפנות אליי ישירות:</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={whatsappHref()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick('error_page')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-white font-semibold"
          >
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
            וואטסאפ
          </a>
          <a
            href={`tel:${CLINIC.phone}`}
            onClick={() => trackPhoneClick('error_page')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-white font-semibold"
          >
            <Phone className="w-5 h-5" aria-hidden="true" />
            {CLINIC.phoneDisplay}
          </a>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 px-6 py-3 text-stone-700 font-semibold"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
            לנסות שוב
          </button>
        </div>
      </div>
    </div>
  );
}
