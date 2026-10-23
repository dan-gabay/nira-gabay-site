'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Phone, Mail, Facebook, MessageCircle, Home, User, FileText, PhoneCall, HeartHandshake } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { trackHeaderNavClick, trackHeaderLogoClick, trackMobileMenuToggle, trackWhatsAppClick, trackSocialClick, trackContactMethodClick } from '@/lib/analytics';
import { whatsappHref, whatsappMessageForPath } from '@/lib/whatsapp';
import { SERVICES_LIVE } from '@/lib/publish';
import { SERVICES } from '@/lib/services';
import { CLINIC } from '@/lib/clinic';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // The mobile menu lists the services under "תחומי טיפול", so CBT or couples
  // therapy is one tap away instead of two and a page load. Same list as the
  // footer: the discreet ones stay out of site-wide navigation.
  const menuServices = SERVICES_LIVE ? SERVICES.filter((s) => !s.discreet) : [];

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
              >
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </a>
              <a 
                href="https://www.facebook.com/nira.gabay" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => trackSocialClick('facebook', 'header')}
              >
                <button
                  aria-label="העמוד של נירה גבאי בפייסבוק"
                  className="border border-stone-300 hover:bg-stone-100 p-2 rounded-lg transition-colors"
                >
                  <Facebook className="w-4 h-4 text-blue-600" aria-hidden="true" />
                </button>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
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
          <div id="mobile-menu" className="lg:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 max-h-[calc(100dvh-80px)] overflow-y-auto overscroll-contain">
            <nav className="container mx-auto px-4 py-6 space-y-2">
              {navItems.map((item) => (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      trackHeaderNavClick(item.name + '_mobile');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      // On a service page its own sub-link is lit instead.
                      isCurrent(item.href) && !(item.href === '/services' && pathname !== '/services')
                        ? 'bg-amber-100 text-stone-900'
                        : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                  {item.href === '/services' && menuServices.length > 0 && (
                    <ul className="mt-1 mr-8 border-r border-stone-200 pr-2">
                      {menuServices.map((s) => {
                        const href = `/services/${s.slug}`;
                        return (
                          <li key={s.slug}>
                            <Link
                              href={href}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                trackHeaderNavClick(s.navLabel + '_mobile');
                              }}
                              aria-current={pathname === href ? 'page' : undefined}
                              className={`flex items-center min-h-[44px] px-3 rounded-xl text-[15px] transition-colors ${
                                pathname === href
                                  ? 'bg-amber-100 text-stone-900'
                                  : 'hover:bg-stone-100 text-stone-600'
                              }`}
                            >
                              {s.navLabel}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
              {/* WhatsApp and a call, side by side. Facebook used to share this
                  row; it takes a visitor off the site at the moment they meant
                  to get in touch, and it stays in the footer. */}
              <div className="pt-4 flex gap-3">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick('header_mobile')}
                  className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  WhatsApp
                </a>
                <a
                  href={CLINIC.phoneHref}
                  onClick={() => trackContactMethodClick('phone', 'header_mobile')}
                  className="flex-1 min-h-[44px] border border-stone-300 hover:bg-stone-100 text-stone-800 px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  התקשרו
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
