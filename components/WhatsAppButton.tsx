'use client';

import { MessageCircle } from 'lucide-react';
import { trackWhatsAppClick } from '@/lib/analytics';

const WHATSAPP_NUMBER = '972507936681';
const WHATSAPP_MESSAGE = 'שלום נירה, אשמח לקבוע פגישה';

export default function WhatsAppButton() {
  const handleClick = () => {
    trackWhatsAppClick('floating_button');
  };

  return (
    <>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
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
