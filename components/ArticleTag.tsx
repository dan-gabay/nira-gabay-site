'use client';

import Link from 'next/link';
import { trackTagClick } from '@/lib/analytics';

type ArticleTagProps = {
  tag: string;
  articleId?: string;
};

export default function ArticleTag({ tag, articleId }: ArticleTagProps) {
  return (
    <Link 
      href={`/articles?tag=${encodeURIComponent(tag)}`}
      className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors"
      onClick={() => trackTagClick(tag, articleId)}
    >
      {tag}
    </Link>
  );
}
