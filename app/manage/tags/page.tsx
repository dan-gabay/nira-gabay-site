'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { 
  ArrowRight,
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
            const updatedTags = tagArray.filter(t => t !== name).join(', ');
            
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">טוען תגיות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link href="/manage" className="text-amber-600 hover:text-amber-700 text-sm mb-2 inline-flex items-center gap-1">
                <ArrowRight className="w-4 h-4" />
                חזרה ללוח בקרה
              </Link>
              <h1 className="text-3xl font-bold text-stone-800">ניהול תגיות</h1>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              תגית חדשה
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="חיפוש תגיות..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Add New Tag Form */}
        {isAdding && (
          <div className="bg-white rounded-xl shadow-sm border-2 border-amber-300 p-6 mb-6">
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <p className="text-stone-600 text-sm">סה"כ תגיות</p>
            <p className="text-2xl font-bold text-stone-800">{tags.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-stone-200">
            <p className="text-stone-600 text-sm">תגיות בשימוש</p>
            <p className="text-2xl font-bold text-green-600">
              {tags.filter(t => (t.article_count || 0) > 0).length}
            </p>
          </div>
        </div>

        {/* Tags List */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-100">
          {filteredTags.length === 0 ? (
            <div className="p-12 text-center text-stone-600">
              {searchTerm ? 'לא נמצאו תגיות התואמות לחיפוש' : 'אין תגיות עדיין'}
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="p-4 hover:bg-stone-50 transition-colors">
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
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        שמור
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        ביטול
                      </button>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <TagIcon className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-stone-800">{tag.name}</span>
                        <span className="text-sm text-stone-500">
                          ({tag.article_count || 0} מאמרים)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(tag)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          עריכה
                        </button>
                        <button
                          onClick={() => deleteTag(tag.id, tag.name, tag.article_count || 0)}
                          className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          מחק
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
