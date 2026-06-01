"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  reading_time?: number;
};

export default function ArticlesList() {
  const [data, setData] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/articles", { cache: "no-store" });
        if (!res.ok) throw new Error("שגיאה בטעינת המאמרים");
        const json = await res.json();
        setData(json.data ?? []);
      } catch (e: any) {
        setError(e?.message ?? "שגיאה לא ידועה");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-stone-100 animate-pulse">
            <div className="h-5 bg-stone-100 rounded w-3/4 mb-2" />
            <div className="h-4 bg-stone-100 rounded w-full mb-1" />
            <div className="h-4 bg-stone-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-stone-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-center py-12 text-stone-400">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>אין מאמרים להצגה</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((a) => (
        <li key={a.id}>
          <Link
            href={`/articles/${a.slug || a.id}`}
            className="group block bg-white rounded-xl p-5 border border-stone-100 hover:border-amber-200 hover:shadow-sm transition-all"
          >
            <h3 className="font-bold text-stone-800 group-hover:text-amber-700 transition-colors mb-1">
              {a.title}
            </h3>
            {a.excerpt && (
              <p className="text-sm text-stone-500 line-clamp-2 mb-2">{a.excerpt}</p>
            )}
            <span className="text-xs text-amber-600 flex items-center gap-1">
              קרא עוד <ArrowLeft className="w-3 h-3" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
