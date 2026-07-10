'use client';

import { MessageCircle, Phone } from 'lucide-react';
import { trackWhatsAppClick, trackContactMethodClick } from '@/lib/analytics';
import { whatsappHref } from '@/lib/whatsapp';

type ServiceCtasProps = {
  whatsappMessage: string;
  sourceId: string; // e.g. 'service_parent_guidance'
  light?: boolean; // buttons on a dark background
};

// The two primary conversion actions (owner priority: WhatsApp, then phone).
export default function ServiceCtas({ whatsappMessage, sourceId, light = false }: ServiceCtasProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <a
        href={whatsappHref(whatsappMessage)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackWhatsAppClick(sourceId)}
        className="inline-flex items-center justify-center gap-2.5 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl text-lg font-medium shadow-lg transition-colors"
      >
        <MessageCircle className="w-5 h-5 flex-shrink-0" />
        שלחו הודעת WhatsApp
      </a>
      <a
        href="tel:050-7936681"
        onClick={() => trackContactMethodClick('phone', sourceId)}
        className={`inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-lg font-medium transition-colors border-2 ${
          light
            ? 'border-white/60 text-white hover:bg-white hover:text-stone-900'
            : 'border-stone-300 text-stone-800 hover:bg-stone-50'
        }`}
      >
        <Phone className="w-5 h-5 flex-shrink-0" />
        050-7936681
      </a>
    </div>
  );
}
