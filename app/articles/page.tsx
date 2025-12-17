'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  tag_names?: string[];
  created_date?: string;
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
      const { data: articlesData } = await supabase
        .from('articles')
        .select('*')
        .eq('is_published', true)
        .order('created_date', { ascending: false });
      
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*');
      
      setArticles(articlesData || []);
      setTags(tagsData || []);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const filteredArticles = articles.filter(article => {
    const matchesSearch =
      !searchQuery ||
      article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      !selectedTag ||
      (Array.isArray(article.tag_names)
        ? article.tag_names.includes(selectedTag)
        : false);

    return matchesSearch && matchesTag;
  });

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block px-4 py-2 bg-amber-100 rounded-full text-amber-800 text-sm mb-6">
              מאמרים
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-6">
              ידע ותובנות
            </h1>
            <p className="text-xl text-stone-600">
              מאמרים, טיפים וכלים מעולם הפסיכותרפיה, ההורות והזוגיות
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 bg-white border-b border-stone-100 sticky top-20 z-30">
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

            {/* Tags */}
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="w-5 h-5 text-stone-400 hidden md:block" />
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
      <section className="py-16 bg-gradient-to-b from-white to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg animate-pulse">
                  <div className="h-52 w-full bg-stone-200" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-stone-200 rounded w-3/4" />
                    <div className="h-4 bg-stone-200 rounded w-full" />
                    <div className="h-4 bg-stone-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((article, index) => (
                <motion.a
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-stone-800 mb-3 group-hover:text-amber-700 transition-colors">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-stone-600 line-clamp-3 mb-4">{article.excerpt}</p>
                    )}
                    <div className="text-amber-700 text-sm font-medium">קרא עוד ←</div>
                  </div>
                </motion.a>
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
