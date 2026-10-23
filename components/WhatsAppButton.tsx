'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { trackWhatsAppClick } from '@/lib/analytics';
import { whatsappHref, whatsappMessageForPath, WHATSAPP_NUMBER } from '@/lib/whatsapp';

/**
 * The floating WhatsApp button. It is the site's top contact source (7 of 12
 * WhatsApp sessions in the 45 days to 22 Oct 2026), so it stays - but in RTL
 * lines end on the left, where it sits, and at 60px with an endless pulse it
 * covered the last words of paragraphs on every phone.
 *
 * So, on mobile it is smaller and closer to the corner, it pulses a few times
 * to be noticed and then rests, and it steps aside while the page's own
 * WhatsApp button is on screen (the home hero, a service page's intro card or
 * closing block, the contact page): two identical green targets stacked on
 * each other help nobody. The header's button does not count, it is always
 * on screen on desktop.
 */
export default function WhatsAppButton() {
  // Prefill names the service the visitor is reading about (see lib/whatsapp.ts)
  const pathname = usePathname();
  const [pageButtonVisible, setPageButtonVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      setPageButtonVisible(onScreen.size > 0);
    });

    // Only links to Nira's own number: an article's "share on WhatsApp" link
    // is also wa.me, and it is not a way to get in touch.
    document
      .querySelectorAll(`main a[href^="https://wa.me/${WHATSAPP_NUMBER}"]`)
      .forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      setPageButtonVisible(false);
    };
  }, [pathname]);

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
        aria-hidden={pageButtonVisible || undefined}
        tabIndex={pageButtonVisible ? -1 : undefined}
        className={`whatsapp-float fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 bg-green-500 hover:bg-green-600 text-white p-3 md:p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          pageButtonVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="שלח הודעה בוואטסאפ"
      >
        <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
      </a>

      <style jsx>{`
        .whatsapp-float {
          animation: pulse 2s 3;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}
