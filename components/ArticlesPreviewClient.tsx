"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { trackCTAClick } from '@/lib/analytics';
import ArticleRow from '@/components/ArticleRow';
import Reveal from '@/components/Reveal';

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
    <section className="py-12 md:py-14 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <Reveal className="text-center mb-8 md:mb-10">
          <h2 className="text-xl md:text-3xl font-bold text-stone-800 mb-3 md:mb-4">מאמרים אחרונים</h2>
          <p className="text-sm md:text-lg text-stone-600 max-w-2xl mx-auto">תובנות, כלים וידע מעולם הפסיכותרפיה וההורות</p>
          <div className="w-16 md:w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mt-4 md:mt-6 mx-auto" />
        </Reveal>

        {/* Same card as /articles, the topic hubs and the related rail:
            a narrow column on the phone, a three-up grid on desktop. */}
        <div className="max-w-3xl mx-auto space-y-3 md:max-w-none md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5 lg:gap-6">
          {articles.map((article, index) => (
            // md:h-full so the Reveal wrapper stretches and the cards in a
            // row end up the same height whatever the title lengths are.
            <Reveal key={article.id} delay={index * 0.08} className="md:h-full">
              <ArticleRow
                article={article}
                index={index}
                headingLevel={3}
                trackLocation="homepage"
              />
            </Reveal>
          ))}
        </div>

        <Reveal className="text-center mt-8 md:mt-12">
          <Link href="/articles" onClick={() => trackCTAClick('all_articles', 'homepage')}>
            <button className="gap-2 min-h-[44px] border border-stone-300 hover:bg-stone-50 rounded-xl px-6 py-3 text-sm md:text-base text-stone-800 inline-flex items-center">
              לכל המאמרים
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
