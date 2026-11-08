'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Award, X } from 'lucide-react';
import { trackLandingCertificatesOpen } from '@/lib/analytics';
import {
  LP_ABOUT,
  LP_CERTIFICATES_MORE,
  LP_CERTIFICATES_PRIMARY,
  type Certificate,
} from '@/lib/landing/adultTherapy';

/**
 * "View certificates" - an in-page document viewer, so the visitor never
 * leaves the landing page to check a qualification.
 *
 * A native <dialog> opened with showModal(): the browser supplies the focus
 * trap, inert background and Escape-to-close, which a hand-rolled modal gets
 * subtly wrong. Focus returns to the button that opened it.
 *
 * The images are not in the page until the dialog opens (rendered on open,
 * then lazy-loaded as they scroll into view), so eight certificate photos never
 * weigh on the first load of a mobile ad click.
 */
export default function CertificatesViewer({
  primary = LP_CERTIFICATES_PRIMARY,
  more = LP_CERTIFICATES_MORE,
}: {
  /** Shown first, under "ההכשרה המקצועית שלי". Each page orders its own. */
  primary?: Certificate[];
  more?: Certificate[];
} = {}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = 'hidden';
    }
    if (!open && d.open) d.close();
  }, [open]);

  const onClose = () => {
    setOpen(false);
    document.documentElement.style.overflow = '';
    openerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
          trackLandingCertificatesOpen();
        }}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full border border-emerald-700/40 text-emerald-800 hover:bg-emerald-50 text-sm md:text-base font-medium transition-colors"
      >
        <Award className="w-4 h-4 md:w-[18px] md:h-[18px]" aria-hidden="true" />
        {LP_ABOUT.certificatesLink}
      </button>

      <dialog
        ref={dialogRef}
        onClose={onClose}
        // Click on the backdrop (the dialog element itself, outside the panel) closes.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        aria-labelledby="lp-certs-title"
        className="lp-certs p-0 m-auto w-full max-w-3xl h-full md:h-[90vh] max-h-none md:max-h-[90vh] md:rounded-3xl bg-white shadow-2xl backdrop:bg-stone-900/70"
      >
        {open && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-stone-200 bg-white">
              <h2 id="lp-certs-title" className="text-base md:text-xl font-bold text-stone-800">
                {LP_ABOUT.certificatesLink}
              </h2>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="סגירה"
                className="w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-600 flex-shrink-0"
                autoFocus
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-4 md:px-6 py-5 space-y-8">
              <CertGroup heading={LP_ABOUT.trainingHeading} certs={primary} />
              <CertGroup heading="הכשרות נוספות" certs={more} />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function CertGroup({ heading, certs }: { heading: string; certs: Certificate[] }) {
  return (
    <section>
      <h3 className="text-sm md:text-base font-bold text-stone-800 mb-3">{heading}</h3>
      <ul className="grid gap-5 sm:grid-cols-2">
        {certs.map((c) => (
          <li key={c.src}>
            <figure className="rounded-2xl border border-stone-200 bg-stone-50 p-2.5 md:p-3">
              <Image
                src={c.src}
                alt={`תעודה: ${c.caption}`}
                width={c.width}
                height={c.height}
                loading="lazy"
                sizes="(max-width: 640px) 92vw, 340px"
                className="w-full h-auto rounded-lg bg-white"
              />
              <figcaption className="mt-2.5 text-[13px] md:text-sm text-stone-700 leading-relaxed">
                <span className="inline-block mb-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium">
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
