import Link from 'next/link';
import { Phone, Mail, Facebook, Home, User, FileText, PhoneCall } from 'lucide-react';
import { trackPhoneClick } from '@/lib/analytics';

export default function Footer() {
  const navItems = [
    { name: 'דף הבית', href: '/' },
    { name: 'קצת עליי', href: '/about' },
    { name: 'מאמרים', href: '/articles' },
    { name: 'צרו קשר', href: '/contact' },
  ];

  return (
    <footer className="bg-stone-800 text-stone-200 mt-20">
      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 font-serif">נירה גבאי</h3>
            <p className="text-stone-400 leading-relaxed">
              מטפלת בפסיכותרפיה ומדריכת הורים. מלווה מתבגרים, מבוגרים וזוגות בדרכם להגשמה עצמית ולחיים מלאים יותר.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 font-serif">ניווט מהיר</h3>
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href}
                    className="text-stone-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 font-serif">יצירת קשר</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-stone-400">
                <Phone className="w-5 h-5" />
                <a 
                  href="tel:050-7936681" 
                  className="hover:text-white transition-colors"
                  onClick={() => trackPhoneClick('footer')}
                >
                  050-7936681
                </a>
              </li>
              <li className="flex items-center gap-3 text-stone-400">
                <Mail className="w-5 h-5" />
                <a href="mailto:niraga1123@gmail.com" className="hover:text-white transition-colors">niraga1123@gmail.com</a>
              </li>
              <li className="flex items-center gap-3 text-stone-400">
                <Facebook className="w-5 h-5" />
                <a href="https://www.facebook.com/nira.gabay" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Facebook
                </a>
              </li>
              <li className="flex items-center gap-3 text-stone-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <a href="https://www.instagram.com/niragabay?igsh=eHV4eGJyeDdsZ3Vt" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-700 mt-12 pt-8 text-center text-stone-500">
          <p>© {new Date().getFullYear()} נירה גבאי - כל הזכויות שמורות</p>
        </div>
      </div>
    </footer>
  );
}
