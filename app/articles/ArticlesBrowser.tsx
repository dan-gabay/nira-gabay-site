'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { trackArticleFilterChange, trackSearch } from '@/lib/analytics';
import { topicPathForTag } from '@/lib/topics';
import ArticleRow from '@/components/ArticleRow';
import ArticleCtaBanner from '@/components/ArticleCtaBanner';
import {
  TEAL_DARK,
  MINT,
  ARTICLES_HERO_BG,
  CHIP_BASE,
  CHIP_IDLE,
  CHIP_ACTIVE,
} from '@/lib/palette';

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


  return (
    <div style={{ paddingTop: '80px' }}>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden" style={{ background: TEAL_DARK }}>
        {/* Anchored left so the artwork's leaf survives the crop on narrow screens */}
        <Image
          src={ARTICLES_HERO_BG}
          alt=""
          fill
          priority
          className="object-cover"
          style={{ objectPosition: 'left center' }}
          sizes="100vw"
        />

        <div className="relative container mx-auto px-4 md:px-8 pt-6 pb-16 md:pt-14 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-2xl mx-auto"
          >
            <span
              className="block w-10 md:w-12 h-px mx-auto mb-4 md:mb-6"
              style={{ background: 'rgba(255,255,255,0.35)' }}
            />
            <h1
              className="text-3xl md:text-6xl font-bold mb-2 md:mb-4 leading-tight"
              style={{ color: MINT }}
            >
              מאמרים
            </h1>
            <p className="text-sm md:text-lg text-white/80 leading-relaxed">
              ידע מקצועי, תובנות וכלים מעשיים
              <br />
              לחיים מלאים ומאוזנים יותר
            </p>
          </motion.div>
        </div>
      </section>

      {/* ───────── Search (straddles the hero's bottom edge) ───────── */}
      <div className="relative z-20 container mx-auto px-4 md:px-8 -mt-6 md:-mt-9">
        <div className="max-w-2xl mx-auto">
          <label htmlFor="articles-search" className="sr-only">
            חיפוש מאמרים
          </label>
          <div className="relative">
            <Search
              className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-stone-400 pointer-events-none"
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
              className="w-full bg-white rounded-full shadow-xl shadow-stone-900/10 border border-stone-100 py-3 md:py-4 pr-5 md:pr-6 pl-11 md:pl-14 text-sm md:text-base text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* ───────── Topic chips ───────── */}
      <div className="container mx-auto px-4 md:px-8 pt-4 md:pt-6">
        <div
          className="flex items-center gap-2 md:gap-2.5 overflow-x-auto scrollbar-hide pb-1 md:justify-center"
          role="group"
          aria-label="סינון לפי נושא"
        >
          <button
            onClick={() => applyTag(null)}
            aria-pressed={selectedTag === null}
            className={`${CHIP_BASE} ${selectedTag === null ? CHIP_ACTIVE : CHIP_IDLE}`}
            style={selectedTag === null ? { background: MINT } : undefined}
          >
            הכל
          </button>
          {/* Tag chips are crawlable links to the topic hub pages; tags
              without a hub fall back to the legacy ?tag= client filter. */}
          {allTags.map((tag) => {
            const hubPath = topicPathForTag(tag.name);
            const isActive = selectedTag === tag.name;
            const chipClass = `${CHIP_BASE} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`;
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
      <section className="py-5 md:py-10 bg-gradient-to-b from-white to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          {visibleArticles.length > 0 ? (
            <>
              {/* Phone: one narrow column of horizontal cards. Desktop: the
                  column cap comes off and the same cards lay out as a grid. */}
              <div className="max-w-3xl mx-auto space-y-3 md:max-w-none md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5 lg:gap-6">
                {visibleArticles.map((article, index) => (
                  <ArticleRow key={article.id} article={article} index={index} />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-6 md:mt-8">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="inline-flex items-center gap-2 px-6 md:px-7 min-h-[40px] md:min-h-[44px] rounded-full border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 text-sm md:text-base font-medium transition-colors"
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
              className="text-center py-12 md:py-20"
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

      <ArticleCtaBanner source="articles_page_cta" />
    </div>
  );
}
