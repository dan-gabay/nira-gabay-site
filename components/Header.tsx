'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Phone, Mail, Facebook, MessageCircle, Home, User, FileText, PhoneCall } from 'lucide-react';
import { usePathname } from 'next/navigation';

const WHATSAPP_NUMBER = '972507936681';
const WHATSAPP_MESSAGE = 'שלום נירה, אשמח לקבוע פגישה';

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
    { name: 'מאמרים', href: '/articles', icon: FileText },
    { name: 'צרו קשר', href: '/contact', icon: PhoneCall },
  ];

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-lg py-3' 
            : 'bg-transparent py-5'
        }`}
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <Image 
                src="https://70wu4ifcxmk7qisg.public.blob.vercel-storage.com/logo.png"
                alt="לוגו נירה גבאי - פסיכותרפיה והדרכת הורים"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-stone-800 font-serif">נירה גבאי</h1>
                <p className="text-xs text-stone-500">פסיכותרפיה והדרכת הורים</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link text-stone-700 hover:text-stone-900 font-medium relative ${
                    pathname === item.href ? 'active text-stone-900' : ''
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </a>
              <a href="https://www.facebook.com/nira.gabay" target="_blank" rel="noopener noreferrer">
                <button className="border border-stone-300 hover:bg-stone-100 p-2 rounded-lg transition-colors">
                  <Facebook className="w-4 h-4 text-blue-600" />
                </button>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="תפריט"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-stone-200">
            <nav className="container mx-auto px-4 py-6 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    pathname === item.href 
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
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                </a>
                <a href="https://www.facebook.com/nira.gabay" target="_blank" rel="noopener noreferrer">
                  <button className="border border-stone-300 p-2 rounded-lg">
                    <Facebook className="w-5 h-5 text-blue-600" />
                  </button>
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
