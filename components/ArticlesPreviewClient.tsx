"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { trackCTAClick } from '@/lib/analytics';
import ArticleRow from '@/components/ArticleRow';

export interface HomeArticlePreview {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  image_url?: string;
  reading_time?: number;
  created_date?: string;
  tags?: string;
  tag_names?: string[];
}

// Articles are fetched server-side (app/page.tsx) and passed as props so the
// links are in the initial HTML for crawlers - this stays a client component
// only for the analytics onClick handlers.
export default function ArticlesPreviewClient({ articles }: { articles: HomeArticlePreview[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="py-12 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-xl md:text-4xl font-bold text-stone-800 mb-3 md:mb-4">מאמרים אחרונים</h2>
          <p className="text-sm md:text-lg text-stone-600 max-w-2xl mx-auto">תובנות, כלים וידע מעולם הפסיכותרפיה וההורות</p>
          <div className="w-16 md:w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mt-4 md:mt-6 mx-auto" />
        </div>

        {/* Same horizontal card as /articles, the topic hubs and the related rail */}
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-4">
          {articles.map((article, index) => (
            <ArticleRow
              key={article.id}
              article={article}
              index={index}
              headingLevel={3}
              trackLocation="homepage"
            />
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12">
          <Link href="/articles" onClick={() => trackCTAClick('all_articles', 'homepage')}>
            <button className="gap-2 min-h-[44px] border border-stone-300 hover:bg-stone-50 rounded-xl px-6 py-3 text-sm md:text-base text-stone-800 inline-flex items-center">
              לכל המאמרים
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
