'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ContentTabs from '@/components/manage/ContentTabs';
import PageHeader from '@/components/manage/PageHeader';
import { 
  Tag as TagIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X
} from 'lucide-react';

type Tag = {
  id: string;
  name: string;
  created_date: string;
  article_count?: number;
};

export default function ManageTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (tagsError) throw tagsError;

      // Get all articles with their tags
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('tags');

      if (articlesError) throw articlesError;

      // Count how many times each tag appears in articles
      const tagCounts: Record<string, number> = {};
      articles?.forEach(article => {
        if (article.tags) {
          const articleTags = article.tags.split(',').map((t: string) => t.trim());
          articleTags.forEach((tagName: string) => {
            if (tagName) {
              tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
            }
          });
        }
      });

      const tagsWithCounts = (tagsData || []).map(tag => ({
        ...tag,
        article_count: tagCounts[tag.name] || 0
      }));

      setTags(tagsWithCounts);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addTag() {
    if (!newTagName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ 
          name: newTagName.trim(),
          created_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setTags([...tags, { ...data, article_count: 0 }]);
      setNewTagName('');
      setIsAdding(false);
      alert('התגית נוספה בהצלחה');
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('שגיאה בהוספת התגית');
    }
  }

  async function updateTag(id: string) {
    if (!editingName.trim()) return;

    try {
      const { error } = await supabase
        .from('tags')
        .update({ name: editingName.trim() })
        .eq('id', id);

      if (error) throw error;

      setTags(tags.map(t => 
        t.id === id ? { ...t, name: editingName.trim() } : t
      ));
      setEditingId(null);
      setEditingName('');
      alert('התגית עודכנה בהצלחה');
    } catch (error) {
      console.error('Error updating tag:', error);
      alert('שגיאה בעדכון התגית');
    }
  }

  async function deleteTag(id: string, name: string, articleCount: number) {
    if (articleCount > 0) {
      const userConfirmed = confirm(
        `התגית "${name}" משויכת ל-${articleCount} מאמרים.\n` +
        `מחיקת התגית תסיר אותה גם מכל המאמרים.\n` +
        `האם אתה בטוח שברצונך למחוק אותה?`
      );
      if (!userConfirmed) return;

      // Remove the tag from all articles
      try {
        const { data: articles, error: fetchError } = await supabase
          .from('articles')
          .select('id, tags')
          .like('tags', `%${name}%`);

        if (fetchError) throw fetchError;

        // Update each article to remove this tag
        for (const article of articles || []) {
          if (article.tags) {
            const tagArray = article.tags.split(',').map((t: string) => t.trim());
            const updatedTags = tagArray.filter((t: string) => t !== name).join(', ');
            
            const { error: updateError } = await supabase
              .from('articles')
              .update({ tags: updatedTags })
              .eq('id', article.id);

            if (updateError) throw updateError;
          }
        }
      } catch (error) {
        console.error('Error removing tag from articles:', error);
        alert('שגיאה בהסרת התגית מהמאמרים');
        return;
      }
    } else {
      if (!confirm(`האם אתה בטוח שברצונך למחוק את התגית "${name}"?`)) {
        return;
      }
    }

    try {
      // Delete tag
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTags(tags.filter(t => t.id !== id));
      alert('התגית נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('שגיאה במחיקת התגית');
    }
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditingName(tag.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5">
        <PageHeader title="תוכן האתר" />
        <ContentTabs />
        <div className="py-20 text-center text-stone-500 text-sm">טוען תגיות...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader title="תוכן האתר" sub="התגיות שלפיהן מאמרים מסודרים באתר." />
      <ContentTabs />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="manage-tag-search" className="sr-only">
            חיפוש תגיות
          </label>
          <input
            id="manage-tag-search"
            type="search"
            placeholder="חיפוש תגיות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] pr-11 pl-4 rounded-xl border border-stone-300 bg-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs md:text-sm font-medium transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          תגית חדשה
        </button>
      </div>

      <div>
        {/* Add New Tag Form */}
        {isAdding && (
          <div className="bg-white rounded-2xl border border-amber-300 p-4 md:p-5 mb-4 md:mb-6">
            <h3 className="text-lg font-bold text-stone-800 mb-4">תגית חדשה</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="שם התגית..."
                className="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
              />
              <button
                onClick={addTag}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                שמור
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewTagName('');
                }}
                className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" />
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* The two counts, as one line rather than two tiles */}
        <p className="text-[12px] md:text-sm text-stone-500 mb-2 px-0.5">
          {tags.length} תגיות, {tags.filter((t) => (t.article_count || 0) > 0).length} מהן בשימוש
        </p>

        {/* Tags List */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          {filteredTags.length === 0 ? (
            <div className="p-8 md:p-12 text-center text-stone-600">
              {searchTerm ? 'לא נמצאו תגיות התואמות לחיפוש' : 'אין תגיות עדיין'}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="p-3 md:px-4 hover:bg-stone-50 transition-colors">
                  {editingId === tag.id ? (
                    // Edit Mode
                    <div className="flex items-center gap-3">
                      <TagIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && updateTag(tag.id)}
                      />
                      <button
                        onClick={() => updateTag(tag.id)}
                        className="bg-green-600 hover:bg-green-700 text-white min-h-[44px] px-4 rounded-xl text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        שמור
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-700 min-h-[44px] px-4 rounded-xl text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        ביטול
                      </button>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <TagIcon className="w-4 h-4 text-stone-400 flex-shrink-0" aria-hidden="true" />
                        <span className="font-medium text-stone-800 text-sm md:text-base">{tag.name}</span>
                        <span className="text-xs md:text-sm text-stone-400">
                          {tag.article_count || 0} מאמרים
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(tag)}
                          title="עריכה"
                          aria-label={`עריכת התגית ${tag.name}`}
                          className="w-10 h-10 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
                        >
                          <Edit className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => deleteTag(tag.id, tag.name, tag.article_count || 0)}
                          title="מחיקה"
                          aria-label={`מחיקת התגית ${tag.name}`}
                          className="w-10 h-10 flex items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
