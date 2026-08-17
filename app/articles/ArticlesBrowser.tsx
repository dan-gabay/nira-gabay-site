'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  FileText,
  ArrowLeft,
  Clock,
  ChevronDown,
  Calendar,
  MessageCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  trackArticleFilterChange,
  trackArticleCardClick,
  trackCTAClick,
  trackSearch,
  trackWhatsAppClick,
} from '@/lib/analytics';
import { topicPathForTag } from '@/lib/topics';

export type ArticleListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image_url?: string;
  reading_time?: number;
  likes_count?: number;
  views_count?: number;
  created_date?: string;
  is_published?: boolean;
  tag_names?: string[];
};

export type Tag = {
  id: string;
  name: string;
};

type ArticlesBrowserProps = {
  articles: ArticleListItem[];
  allTags: Tag[];
  initialSearch?: string;
  initialTag?: string;
};

// Page palette: deep teal ground with a mint accent.
const TEAL_DARK = '#1A4A44';
const MINT = '#3FC195';

// Background artwork. Both files already carry the leaf line-art and their own
// gradient; the solid colours below stay as the paint-in/fallback layer.
const HERO_BG = '/images/articles-hero.webp';
const CTA_BG = '/images/articles-cta.webp';

const WA_HREF = `https://wa.me/972507936681?text=${encodeURIComponent(
  'שלום נירה, אשמח לקבוע פגישה',
)}`;

const PAGE_SIZE = 6;

export default function ArticlesBrowser({
  articles,
  allTags,
  initialSearch,
  initialTag,
}: ArticlesBrowserProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag || null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      !searchQuery ||
      article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      !selectedTag ||
      (Array.isArray(article.tag_names) && article.tag_names.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = filteredArticles.length > visibleCount;

  // Any filter change restarts the list from the first page.
  function applySearch(value: string) {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  }

  function applyTag(tag: string | null) {
    setSelectedTag(tag);
    setVisibleCount(PAGE_SIZE);
    trackArticleFilterChange('tag', tag ?? 'all');
  }

  const chipBase =
    'px-5 min-h-[44px] inline-flex items-center rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors';
  const chipIdle =
    'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50';
  const chipActive = 'text-white shadow-sm';

  return (
    <div style={{ paddingTop: '80px' }}>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden" style={{ background: TEAL_DARK }}>
        {/* Anchored left so the artwork's leaf survives the crop on narrow screens */}
        <Image
          src={HERO_BG}
          alt=""
          fill
          priority
          className="object-cover"
          style={{ objectPosition: 'left center' }}
          sizes="100vw"
        />

        <div className="relative container mx-auto px-4 md:px-8 pt-10 pb-24 md:pt-14 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto"
          >
            <span
              className="block w-12 h-px mx-auto mb-6"
              style={{ background: 'rgba(255,255,255,0.35)' }}
            />
            <h1
              className="text-5xl md:text-6xl font-bold mb-4 leading-tight"
              style={{ color: MINT }}
            >
              מאמרים
            </h1>
            <p className="text-base md:text-lg text-white/80 leading-relaxed">
              ידע מקצועי, תובנות וכלים מעשיים
              <br />
              לחיים מלאים ומאוזנים יותר
            </p>
          </motion.div>
        </div>
      </section>

      {/* ───────── Search (straddles the hero's bottom edge) ───────── */}
      <div className="relative z-20 container mx-auto px-4 md:px-8 -mt-9">
        <div className="max-w-2xl mx-auto">
          <label htmlFor="articles-search" className="sr-only">
            חיפוש מאמרים
          </label>
          <div className="relative">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="articles-search"
              type="search"
              placeholder="חיפוש מאמרים..."
              value={searchQuery}
              onChange={(e) => applySearch(e.target.value)}
              onBlur={() => {
                if (searchQuery) {
                  trackArticleFilterChange('search', searchQuery);
                  trackSearch(searchQuery, filteredArticles.length); // GA4 recommended event
                }
              }}
              className="w-full bg-white rounded-full shadow-xl shadow-stone-900/10 border border-stone-100 py-4 pr-6 pl-14 text-base text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* ───────── Topic chips ───────── */}
      <div className="container mx-auto px-4 md:px-8 pt-6">
        <div
          className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide pb-1 md:justify-center"
          role="group"
          aria-label="סינון לפי נושא"
        >
          <button
            onClick={() => applyTag(null)}
            aria-pressed={selectedTag === null}
            className={`${chipBase} ${selectedTag === null ? chipActive : chipIdle}`}
            style={selectedTag === null ? { background: MINT } : undefined}
          >
            הכל
          </button>
          {/* Tag chips are crawlable links to the topic hub pages; tags
              without a hub fall back to the legacy ?tag= client filter. */}
          {allTags.map((tag) => {
            const hubPath = topicPathForTag(tag.name);
            const isActive = selectedTag === tag.name;
            const chipClass = `${chipBase} ${isActive ? chipActive : chipIdle}`;
            const chipStyle = isActive ? { background: MINT } : undefined;
            return hubPath ? (
              <Link
                key={tag.id}
                href={hubPath}
                className={chipClass}
                style={chipStyle}
                onClick={() => trackArticleFilterChange('tag', tag.name)}
              >
                {tag.name}
              </Link>
            ) : (
              <button
                key={tag.id}
                onClick={() => applyTag(tag.name)}
                aria-pressed={isActive}
                className={chipClass}
                style={chipStyle}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────── Article list ───────── */}
      <section className="py-8 md:py-10 bg-gradient-to-b from-white to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          {visibleArticles.length > 0 ? (
            <>
              <div className="max-w-3xl mx-auto space-y-4">
                {visibleArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/articles/${article.slug || article.id}`}
                    prefetch={index < 4}
                    onClick={() => trackArticleCardClick(article.title, article.slug)}
                    className="group flex items-stretch gap-4 bg-white rounded-2xl p-3 md:p-4 shadow-sm hover:shadow-lg border border-stone-100 transition-shadow"
                  >
                    {/* Text first: in RTL this sits on the right, image on the left */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <h2 className="text-lg md:text-xl font-bold text-stone-800 leading-snug line-clamp-2 mb-1.5 group-hover:text-emerald-700 transition-colors">
                        {article.title}
                      </h2>
                      {article.excerpt && (
                        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-xs text-stone-400">
                          {article.reading_time ? (
                            <>
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                              {article.reading_time} דק׳ קריאה
                            </>
                          ) : null}
                        </span>
                        <span
                          className="text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                          style={{ color: MINT }}
                        >
                          קרא עוד
                          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                        </span>
                      </div>
                    </div>

                    <div className="relative w-28 md:w-40 flex-shrink-0 self-stretch min-h-[104px] rounded-xl overflow-hidden bg-stone-100">
                      {article.image_url ? (
                        <Image
                          src={article.image_url}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 112px, 160px"
                          loading={index < 4 ? 'eager' : 'lazy'}
                          priority={index < 4}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-stone-100">
                          <FileText className="w-6 h-6 text-emerald-600/60" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 px-7 min-h-[44px] rounded-full border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 font-medium transition-colors"
                  >
                    טען עוד מאמרים
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-stone-400" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2">לא נמצאו מאמרים</h2>
              <p className="text-stone-600">
                {searchQuery || selectedTag
                  ? 'נסו לשנות את החיפוש או הסינון'
                  : 'מאמרים חדשים יעלו בקרוב'}
              </p>
              {(searchQuery || selectedTag) && (
                <button
                  onClick={() => {
                    applySearch('');
                    applyTag(null);
                  }}
                  className="mt-4 px-6 min-h-[44px] border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
                >
                  נקה סינון
                </button>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* ───────── CTA banner ───────── */}
      <section className="pb-12 px-4 md:px-8 bg-stone-50">
        <div className="container mx-auto">
          <div
            className="relative overflow-hidden rounded-3xl"
            style={{ background: `linear-gradient(115deg, ${MINT} 0%, #1F7A63 100%)` }}
          >
            <Image
              src={CTA_BG}
              alt=""
              fill
              loading="lazy"
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />

            <div className="relative px-5 py-8 md:px-12 md:py-14 flex flex-row items-center justify-between gap-4 md:gap-8">
              <div className="min-w-0 text-right">
                <h2 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3">
                  מוכנים לעשות שינוי?
                </h2>
                <p className="text-sm md:text-base text-white/90 leading-relaxed">
                  אני כאן כדי ללוות אתכם בדרך
                  <br />
                  להגשמה עצמית וחיים מלאים יותר
                </p>
              </div>

              <div className="flex flex-col gap-3 flex-shrink-0">
                <Link
                  href="/contact"
                  onClick={() => trackCTAClick('contact', 'articles_page_cta')}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 md:px-7 rounded-full border border-white/70 text-white text-sm md:text-base font-medium whitespace-nowrap hover:bg-white/15 transition-colors"
                >
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" aria-hidden="true" />
                  קבעו פגישה
                </Link>
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick('articles_page_cta')}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 md:px-7 rounded-full border border-white/70 text-white text-sm md:text-base font-medium whitespace-nowrap hover:bg-white/15 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" aria-hidden="true" />
                  שלחו הודעת WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
