import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// Rendered (with a real 404 status) when an article slug does not resolve to a
// published article. Replaces the previous in-page "not found" JSX that returned
// HTTP 200 - a soft 404 that wastes crawl budget and risks indexing empty pages.
export default function ArticleNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 py-24" style={{ paddingTop: '120px' }}>
      <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ArrowRight className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-stone-800 mb-3">המאמר לא נמצא</h1>
        <p className="text-stone-500 mb-8">ייתכן שהמאמר הוסר או שהכתובת שגויה</p>
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 px-6 py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          חזרה לכל המאמרים
        </Link>
      </div>
    </div>
  );
}
