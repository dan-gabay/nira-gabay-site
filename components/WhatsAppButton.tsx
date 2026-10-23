'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { trackWhatsAppClick } from '@/lib/analytics';
import { whatsappHref, whatsappMessageForPath } from '@/lib/whatsapp';

export default function WhatsAppButton() {
  // Prefill names the service the visitor is reading about (see lib/whatsapp.ts)
  const pathname = usePathname();

  const handleClick = () => {
    trackWhatsAppClick('floating_button');
  };

  return (
    <>
      <a
        href={whatsappHref(whatsappMessageForPath(pathname))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="whatsapp-float fixed bottom-6 left-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110"
        aria-label="שלח הודעה בוואטסאפ"
      >
        <MessageCircle className="w-7 h-7" />
      </a>

      <style jsx>{`
        .whatsapp-float {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}
