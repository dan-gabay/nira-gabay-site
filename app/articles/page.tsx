'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  image_url?: string;
  reading_time?: number;
  likes_count?: number;
  views_count?: number;
  created_date?: string;
  is_published?: boolean;
  tag_names?: string[];
  article_tags?: Array<{tags: {name: string}}>;
};

type Tag = {
  id: string;
  name: string;
};

export default function Articles() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch articles with tags from the tags field
      const { data: articlesData } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          content,
          image_url,
          reading_time,
          likes_count,
          views_count,
          created_date,
          is_published,
          tags
        `)
        .eq('is_published', true)
        .order('created_date', { ascending: false });
      
      const { data: tagsData } = await supabase
        .from('tags')
        .select('id, name');
      
      // Transform the data to extract tag names from the tags string field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedArticles = (articlesData || []).map((article: any) => ({
        ...article,
        tag_names: article.tags ? article.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
      }));
      
      setArticles(transformedArticles as Article[]);
      setTags(tagsData || []);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      !searchQuery ||
      article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      !selectedTag ||
      (Array.isArray(article.tag_names) && article.tag_names.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  return (
    <div className="overflow-hidden" style={{ paddingTop: '80px' }}>
      {/* Hero */}
      <section className="py-10 md:py-16 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block px-3 py-1.5 bg-amber-100 rounded-full text-amber-800 text-sm mb-4">
              מאמרים
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-stone-800 mb-3 md:mb-4">
              ידע ותובנות
            </h1>
            <p className="text-base md:text-lg text-stone-600">
              מאמרים, טיפים וכלים מעולם הפסיכותרפיה, ההורות והזוגיות
            </p>
          </motion.div>
        </div>
      </section>

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
                className="w-full pr-10 bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Tags - horizontal scroll on mobile */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <Filter className="w-5 h-5 text-stone-400 flex-shrink-0 hidden md:block" />
              <button
                onClick={() => setSelectedTag(null)}
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
                  onClick={() => setSelectedTag(tag.name)}
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
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg">
                  <div className="relative w-full aspect-[16/9] bg-stone-200 animate-pulse" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-stone-200 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-stone-200 rounded w-full animate-pulse" />
                    <div className="h-4 bg-stone-200 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug || article.id}`}
                  prefetch={index < 6}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow block"
                >
                  {/* Article Image */}
                  {article.image_url && (
                    <div className="relative w-full aspect-[16/9] overflow-hidden bg-stone-100">
                      <Image
                        src={article.image_url}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading={index < 6 ? "eager" : "lazy"}
                        priority={index < 6}
                      />
                    </div>
                  )}
                  
                  <div className="p-4 md:p-5">
                    <h3 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-amber-700 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-stone-600 text-sm line-clamp-2 mb-3">{article.excerpt}</p>
                    )}
                    {!article.slug && (
                      <div className="text-xs text-red-500 mb-2">⚠️ חסר slug - משתמש ב-ID</div>
                    )}
                    <div className="text-amber-700 text-sm font-medium">קרא עוד ←</div>
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
          >
            צרו קשר
          </a>
        </div>
      </section>
    </div>
  );
}
