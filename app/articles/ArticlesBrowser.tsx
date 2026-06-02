'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, FileText, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { trackArticleFilterChange, trackArticleCardClick, trackCTAClick, trackSearch } from '@/lib/analytics';

export type BrowserArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image_url?: string;
  reading_time?: number;
  created_date?: string;
  tag_names: string[];
};

export type BrowserTag = {
  id: string;
  name: string;
};

type Props = {
  articles: BrowserArticle[];
  tags: BrowserTag[];
};

export default function ArticlesBrowser({ articles, tags }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Search is title + excerpt only (the full article body is intentionally not
  // shipped to the client — it kept the payload heavy for no real UX gain).
  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesSearch =
        !q ||
        article.title?.toLowerCase().includes(q) ||
        article.excerpt?.toLowerCase().includes(q);

      const matchesTag =
        !selectedTag ||
        (Array.isArray(article.tag_names) && article.tag_names.includes(selectedTag));

      return matchesSearch && matchesTag;
    });
  }, [articles, searchQuery, selectedTag]);

  return (
    <>
      {/* Search & Filter */}
      <section className="py-8 bg-white border-b border-stone-100 sticky top-[80px] z-30" style={{ minHeight: '88px' }}>
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="חיפוש מאמרים..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (searchQuery) {
                    trackArticleFilterChange('search', searchQuery);
                    trackSearch(searchQuery, filteredArticles.length); // GA4 recommended event
                  }
                }}
                aria-label="חיפוש מאמרים"
                className="w-full pr-10 bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Tags - horizontal scroll on mobile */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <Filter className="w-5 h-5 text-stone-400 flex-shrink-0 hidden md:block" />
              <button
                onClick={() => {
                  setSelectedTag(null);
                  trackArticleFilterChange('tag', 'all');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                  selectedTag === null
                    ? 'bg-stone-800 text-white'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                הכל
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    setSelectedTag(tag.name);
                    trackArticleFilterChange('tag', tag.name);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                    selectedTag === tag.name
                      ? 'bg-stone-800 text-white'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-8 md:py-12 bg-gradient-to-b from-white to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredArticles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug || article.id}`}
                  prefetch={index < 6}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 block border border-stone-100"
                  onClick={() => trackArticleCardClick(article.title, article.slug)}
                >
                  {/* Article Image or Warm Placeholder */}
                  <div className="relative w-full aspect-[16/9] overflow-hidden">
                    {article.image_url ? (
                      <Image
                        src={article.image_url}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading={index < 6 ? 'eager' : 'lazy'}
                        priority={index < 6}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center opacity-60">
                          <FileText className="w-6 h-6 text-amber-600" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-6">
                    {/* Tags */}
                    {article.tag_names && article.tag_names.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {article.tag_names.slice(1, 3).map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <h3 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-stone-500 text-sm line-clamp-2 mb-4 leading-relaxed">{article.excerpt}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-400">
                        {article.reading_time ? `${article.reading_time} דק׳ קריאה` : ''}
                      </span>
                      <span className="text-amber-700 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        קראו עוד
                        <ArrowLeft className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-stone-400" />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">לא נמצאו מאמרים</h3>
              <p className="text-stone-600">
                {searchQuery || selectedTag
                  ? 'נסו לשנות את החיפוש או הסינון'
                  : 'מאמרים חדשים יעלו בקרוב'}
              </p>
              {(searchQuery || selectedTag) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag(null);
                  }}
                  className="mt-4 px-6 py-2 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  נקה סינון
                </button>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-amber-50">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold text-stone-800 mb-4">מעוניינים בייעוץ אישי?</h2>
          <p className="text-xl text-stone-600 mb-8">אשמח לעזור לכם במסע שלכם</p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            onClick={() => trackCTAClick('contact', 'articles_page_cta')}
          >
            צרו קשר
          </a>
        </div>
      </section>
    </>
  );
}
