'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FileText, ArrowLeft, Clock } from 'lucide-react';
import { trackArticleCardClick } from '@/lib/analytics';
import { MINT } from '@/lib/palette';
import type { ArticleListItem } from '@/app/articles/ArticlesBrowser';

// One horizontal article card: copy on the right, thumbnail on the left (RTL).
// Shared by the /articles index and the topic hubs so the two stay identical.
export default function ArticleRow({
  article,
  index,
  headingLevel = 2,
}: {
  article: ArticleListItem;
  index: number;
  // The index page has no section heading above the list, so its cards are h2.
  // Topic hubs sit under a "מאמרים בנושא X" h2, so theirs are h3.
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <Link
      href={`/articles/${article.slug || article.id}`}
      prefetch={index < 4}
      onClick={() => trackArticleCardClick(article.title, article.slug)}
      className="group flex items-stretch gap-3 md:gap-4 bg-white rounded-2xl p-2.5 md:p-4 shadow-sm hover:shadow-lg border border-stone-100 transition-shadow"
    >
      {/* Text first: in RTL this sits on the right, image on the left */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Heading className="text-base md:text-xl font-bold text-stone-800 leading-snug line-clamp-2 mb-1 md:mb-1.5 group-hover:text-emerald-700 transition-colors">
          {article.title}
        </Heading>
        {article.excerpt && (
          <p className="text-xs md:text-sm text-stone-500 leading-relaxed line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <div className="mt-auto pt-2 md:pt-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[11px] md:text-xs text-stone-400">
            {article.reading_time ? (
              <>
                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" aria-hidden="true" />
                {article.reading_time} דק׳ קריאה
              </>
            ) : null}
          </span>
          <span
            className="text-xs md:text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
            style={{ color: MINT }}
          >
            קרא עוד
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="relative w-24 md:w-40 flex-shrink-0 self-stretch min-h-[86px] md:min-h-[104px] rounded-xl overflow-hidden bg-stone-100">
        {article.image_url ? (
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 96px, 160px"
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
  );
}
