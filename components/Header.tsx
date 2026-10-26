'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Phone, Mail, Facebook, MessageCircle, Home, User, FileText, PhoneCall, HeartHandshake } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { trackHeaderNavClick, trackHeaderLogoClick, trackMobileMenuToggle, trackWhatsAppClick, trackSocialClick, trackContactMethodClick } from '@/lib/analytics';
import { whatsappHref, whatsappMessageForPath } from '@/lib/whatsapp';
import { SERVICES_LIVE } from '@/lib/publish';
import { CLINIC } from '@/lib/clinic';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // The menu remembers the page it was opened on, so any navigation closes
  // it - back/forward too, which never passes a link's onClick.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const mobileMenuOpen = menuOpenOn === pathname;
  const setMobileMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Open: focus moves into the panel, and Escape closes it and returns focus
  // to the toggle. A link click is left alone - it navigates, and the new page
  // keeps its own focus order.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const panel = mobileMenuRef.current;
    panel?.querySelector<HTMLElement>('a, button')?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpenOn(null);
      trackMobileMenuToggle('close');
      menuToggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const navItems = [
    { name: 'דף הבית', href: '/', icon: Home },
    { name: 'קצת עליי', href: '/about', icon: User },
    // Hidden until Nira approves the service pages (lib/publish.ts).
    ...(SERVICES_LIVE
      ? [{ name: 'תחומי טיפול', href: '/services', icon: HeartHandshake }]
      : []),
    { name: 'מאמרים', href: '/articles', icon: FileText },
    { name: 'צרו קשר', href: '/contact', icon: PhoneCall },
  ];

  // A section's nav item stays lit on its sub-pages too, so /services/cbt
  // still shows "תחומי טיפול" as current. '/' would match everything.
  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  // Prefill names the service the visitor is reading about (see lib/whatsapp.ts)
  const waHref = whatsappHref(whatsappMessageForPath(pathname));

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-lg' 
            : 'bg-transparent'
        }`}
        style={{ height: '80px' }}
      >
        <div className="container mx-auto px-4 md:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3" onClick={() => trackHeaderLogoClick()}>
              <Image 
                src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/logo.png"
                alt="לוגו נירה גבאי - פסיכותרפיה והדרכת הורים"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
              <div className="hidden sm:block">
                {/* Brand label only — not an <h1>, so each page keeps a single, page-specific H1 */}
                <span className="block text-lg font-bold text-stone-800 font-serif">נירה גבאי</span>
                <p className="text-xs text-stone-500">פסיכותרפיה והדרכת הורים</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => trackHeaderNavClick(item.name)}
                  className={`nav-link text-stone-700 hover:text-stone-900 font-medium relative ${
                    isCurrent(item.href) ? 'active text-stone-900' : ''
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Many people read at a desk and call from their mobile, so the
                  number is visible, not only a WhatsApp button. Icon-only on
                  narrow desktops, where the nav needs the room. */}
              <a
                href={CLINIC.phoneHref}
                onClick={() => trackContactMethodClick('phone', 'header')}
                aria-label={`התקשרו ${CLINIC.phoneDisplay}`}
                className="flex items-center gap-2 text-stone-700 hover:text-stone-900 font-medium transition-colors"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span dir="ltr" className="hidden xl:inline">{CLINIC.phoneDisplay}</span>
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('header')}
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                WhatsApp
              </a>
              <a
                href="https://www.facebook.com/nira.gabay"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('facebook', 'header')}
                aria-label="העמוד של נירה גבאי בפייסבוק"
                className="border border-stone-300 hover:bg-stone-100 p-2 rounded-lg transition-colors"
              >
                <Facebook className="w-4 h-4 text-blue-600" aria-hidden="true" />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              ref={menuToggleRef}
              className="lg:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors"
              onClick={() => {
                const newState = !mobileMenuOpen;
                setMobileMenuOpen(newState);
                trackMobileMenuToggle(newState ? 'open' : 'close');
              }}
              aria-label="תפריט"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" ref={mobileMenuRef} className="lg:hidden bg-white/95 backdrop-blur-md border-t border-stone-200">
            <nav className="container mx-auto px-4 py-6 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    // Another page: leave the menu open. It closes when the
                    // new page renders (menuOpenOn stops matching pathname),
                    // so the old page never flashes back in between.
                    if (pathname === item.href) setMobileMenuOpen(false);
                    trackHeaderNavClick(item.name + '_mobile');
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isCurrent(item.href)
                      ? 'bg-amber-100 text-stone-900' 
                      : 'hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 flex gap-3">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                  onClick={() => trackWhatsAppClick('header_mobile')}
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  WhatsApp
                </a>
                <a
                  href="https://www.facebook.com/nira.gabay"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialClick('facebook', 'header_mobile')}
                  aria-label="העמוד של נירה גבאי בפייסבוק"
                  className="border border-stone-300 p-2 rounded-lg"
                >
                  <Facebook className="w-5 h-5 text-blue-600" aria-hidden="true" />
                </a>
              </div>
            </nav>
          </div>
        )}
      </header>

      <style jsx global>{`
        .nav-link {
          position: relative;
          transition: color 0.3s ease;
        }
        
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          right: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #8B7355, #D4B896);
          transition: width 0.3s ease;
        }
        
        .nav-link:hover::after,
        .nav-link.active::after {
          width: 100%;
        }
      `}</style>
    </>
  );
}
