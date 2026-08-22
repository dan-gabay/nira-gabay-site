'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FileText, ArrowLeft, Clock } from 'lucide-react';
import { trackArticleCardClick, trackReadMoreClick } from '@/lib/analytics';
import { MINT } from '@/lib/palette';
import type { ArticleListItem } from '@/app/articles/ArticlesBrowser';

// One article card, in two shapes from one piece of markup.
//
// Phone: horizontal - copy on the right, thumbnail on the left (RTL) - so a
// list of them scans quickly in a narrow column.
//
// Desktop (md and up): the same card turns vertical, image on top, and the
// lists that use it become grids. A single stretched column of horizontal
// rows is a phone layout wearing a desktop's clothes; the wide viewport is
// there to be used.
//
// Every desktop rule below is behind `md:`, so the phone rendering is
// untouched by the card variant.
//
// The image is the second child and `md:flex-col-reverse` puts it on top,
// which keeps the heading first in the DOM for screen readers and for the
// tab order.
//
// Shared by the /articles index, the topic hubs, the homepage rail, the
// service pages and the related-articles rail so they cannot drift apart.
export default function ArticleRow({
  article,
  index,
  headingLevel = 2,
  trackAs = 'card',
  trackLocation,
}: {
  article: ArticleListItem;
  index: number;
  // The index page has no section heading above the list, so its cards are h2.
  // Topic hubs, the homepage rail and the related rail sit under a section
  // heading, so theirs are h3/h4.
  headingLevel?: 2 | 3 | 4;
  // Keeps the related-articles rail on its existing analytics event rather
  // than folding it into the generic card-click metric.
  trackAs?: 'card' | 'related';
  // Attribution for the card-click event (defaults to 'articles_page').
  trackLocation?: string;
}) {
  const Heading = headingLevel === 4 ? 'h4' : headingLevel === 3 ? 'h3' : 'h2';

  const handleClick = () => {
    if (trackAs === 'related') {
      trackReadMoreClick('related_article', article.title, 'article_page');
    } else {
      trackArticleCardClick(article.title, article.slug, trackLocation);
    }
  };

  return (
    <Link
      href={`/articles/${article.slug || article.id}`}
      prefetch={index < 4}
      onClick={handleClick}
      className="group flex items-stretch gap-3 bg-white rounded-2xl p-2.5 shadow-sm hover:shadow-lg border border-stone-100 transition-shadow md:h-full md:flex-col-reverse md:gap-0 md:p-0 md:overflow-hidden"
    >
      {/* Text first: in RTL this sits on the right, image on the left */}
      <div className="flex-1 min-w-0 flex flex-col md:p-5">
        <Heading className="text-base md:text-lg font-bold text-stone-800 leading-snug line-clamp-2 mb-1 md:mb-1.5 group-hover:text-emerald-700 transition-colors">
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

      <div className="relative w-24 flex-shrink-0 self-stretch min-h-[86px] rounded-xl overflow-hidden bg-stone-100 md:w-full md:min-h-0 md:aspect-[16/9] md:rounded-none">
        {article.image_url ? (
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 96px, (max-width: 1024px) 50vw, 33vw"
            loading={index < 4 ? 'eager' : 'lazy'}
            priority={index < 4}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-stone-100">
            <FileText className="w-6 h-6 md:w-9 md:h-9 text-emerald-600/60" aria-hidden="true" />
          </div>
        )}
      </div>
    </Link>
  );
}
