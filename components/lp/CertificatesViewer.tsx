'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { Award, ChevronDown } from 'lucide-react';
import { trackLandingCertificatesOpen } from '@/lib/analytics';
import {
  LP_ABOUT,
  LP_CERTIFICATES_MORE,
  LP_CERTIFICATES_PRIMARY,
  type Certificate,
} from '@/lib/landing/adultTherapy';

/**
 * "View certificates" - an in-page panel that expands under the trainings
 * list and collapses again, so the visitor never leaves the landing page.
 *
 * Nothing loads until the first open: the panel's images are not rendered
 * before then, and after that they are lazy-loaded as they scroll into view,
 * so eight certificate photos never weigh on the first load of an ad click.
 * The panel stays mounted after the first open, so closing and reopening is
 * instant.
 *
 * The open/close animation is a grid-template-rows transition (0fr -> 1fr),
 * which animates to the content's real height without measuring it.
 *
 * Layout: the parent is a flex row that wraps; the panel takes a full row
 * (basis-full, order-last) under the button and the "about" link.
 */
export default function CertificatesViewer({
  primary = LP_CERTIFICATES_PRIMARY,
  more = LP_CERTIFICATES_MORE,
}: {
  /** Shown first ("תעודות ההכשרה"). Each page orders its own. */
  primary?: Certificate[];
  more?: Certificate[];
} = {}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const panelId = useId();

  const toggle = () => {
    if (!open && !loaded) {
      setLoaded(true);
      trackLandingCertificatesOpen();
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full border border-emerald-700/40 text-emerald-800 hover:bg-emerald-50 text-sm md:text-base font-medium transition-colors"
      >
        <Award className="w-4 h-4 md:w-[18px] md:h-[18px]" aria-hidden="true" />
        {LP_ABOUT.certificatesLink}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        className={`basis-full w-full order-last grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
        // Closed: hidden from screen readers and keyboard, not only visually.
        inert={!open}
      >
        <div className="overflow-hidden">
          {loaded && (
            <div className="pt-2 space-y-6 md:space-y-8">
              <CertGroup heading="תעודות ההכשרה" certs={primary} />
              <CertGroup heading="הכשרות נוספות" certs={more} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CertGroup({ heading, certs }: { heading: string; certs: Certificate[] }) {
  return (
    <section>
      <h3 className="text-sm md:text-base font-bold text-stone-800 mb-3">{heading}</h3>
      <ul className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        {certs.map((c) => (
          <li key={c.src}>
            <figure className="h-full rounded-2xl border border-stone-200 bg-stone-50 p-2 md:p-2.5">
              {/* Tap opens the full-size image, for reading the details. */}
              <a href={c.src} target="_blank" rel="noopener noreferrer" className="block">
                <Image
                  src={c.src}
                  alt={`תעודה: ${c.caption}`}
                  width={c.width}
                  height={c.height}
                  loading="lazy"
                  sizes="(max-width: 1024px) 45vw, 220px"
                  className="w-full h-auto rounded-lg bg-white"
                />
              </a>
              <figcaption className="mt-2 text-xs md:text-[13px] text-stone-700 leading-relaxed">
                <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] md:text-xs font-medium">
                  {c.field}
                </span>
                <span className="block">{c.caption}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
