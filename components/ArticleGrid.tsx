'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import { trackArticleCardClick } from '@/lib/analytics';
import type { ArticleListItem } from '@/app/articles/ArticlesBrowser';

// Same card markup as the /articles index grid, reusable from server pages
// (topic hubs). Client component only for the card-click analytics.
export default function ArticleGrid({ articles }: { articles: ArticleListItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {articles.map((article, index) => (
        <Link
          key={article.id}
          href={`/articles/${article.slug || article.id}`}
          prefetch={index < 6}
          className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 block border border-stone-100"
          onClick={() => trackArticleCardClick(article.title, article.slug)}
        >
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
            {article.tag_names && article.tag_names.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {article.tag_names.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h3 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
              {article.title}
            </h3>
            {article.excerpt && (
              <p className="text-stone-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400">
                {article.reading_time ? `${article.reading_time} דק׳ קריאה` : ''}
              </span>
              <span className="text-amber-700 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                קרא עוד
                <ArrowLeft className="w-4 h-4" />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
