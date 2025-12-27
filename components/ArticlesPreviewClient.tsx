"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  image_url?: string;
  created_date?: string;
  tags?: string;
  tag_names?: string[];
}

export default function ArticlesPreviewClient() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('is_published', true)
        .order('created_date', { ascending: false })
        .limit(3);

      if (data) {
        const articlesWithTags = data.map((article: Article) => ({
          ...article,
          tag_names: article.tags ? article.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
        }));
        setArticles(articlesWithTags);
      }
      setLoading(false);
    }

    fetchArticles();
  }, []);

  if (loading || articles.length === 0) return null;

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">מאמרים אחרונים</h2>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">תובנות, כלים וידע מעולם הפסיכותרפיה וההורות</p>
          <div className="w-24 h-1 bg-gradient-to-l from-amber-400 to-stone-400 rounded-full mt-6 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <div key={article.id}>
              <Link href={`/articles/${article.slug}`} prefetch={true}>
                <div className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-stone-100 h-full flex flex-col">
                  {article.image_url && (
                    <div className="relative w-full aspect-[16/9] overflow-hidden bg-stone-100">
                      <Image
                        src={article.image_url}
                        alt={article.title}
                        fill
                        loading="lazy"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  )}

                  <div className="p-6 flex-1 flex flex-col">
                    {article.tag_names && article.tag_names.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {article.tag_names.slice(0, 2).map((tag: string, i: number) => (
                          <span key={i} className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">{tag}</span>
                        ))}
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-stone-800 mb-3 group-hover:text-amber-700 transition-colors line-clamp-2">{article.title}</h3>

                    {article.excerpt && (
                      <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">{article.excerpt}</p>
                    )}

                    <div className="flex items-center justify-between text-sm text-stone-500 pt-4 border-t border-stone-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {article.created_date && new Date(article.created_date).toLocaleDateString('he-IL')}
                      </div>
                      <span className="text-amber-700 font-medium group-hover:gap-2 flex items-center transition-all">
                        קראו עוד
                        <ArrowLeft className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/articles">
            <button className="gap-2 border border-stone-300 hover:bg-stone-50 rounded-xl px-6 py-3 text-stone-800 inline-flex items-center">
              לכל המאמרים
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
