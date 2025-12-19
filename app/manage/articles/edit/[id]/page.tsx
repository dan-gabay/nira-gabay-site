'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ArrowRight, Save } from 'lucide-react';

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image_url: '',
    tags: '',
    is_published: false,
    reading_time: 5
  });

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  async function loadArticle() {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (error) throw error;
      
      setFormData({
        title: data.title || '',
        slug: data.slug || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        image_url: data.image_url || '',
        tags: data.tags || '',
        is_published: data.is_published || false,
        reading_time: data.reading_time || 5
      });
    } catch (error) {
      console.error('Error loading article:', error);
      alert('שגיאה בטעינת המאמר');
      router.push('/manage/articles');
    } finally {
      setLoading(false);
    }
  }

  function calculateReadingTime(text: string): number {
    // Calculate based on Hebrew text: ~1000 characters per minute
    const charCount = text.length;
    const minutes = Math.max(1, Math.ceil(charCount / 1000));
    return minutes;
  }

  function handleChange(field: string, value: string | boolean | number) {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-calculate reading time from content
    if (field === 'content' && typeof value === 'string') {
      const readingTime = calculateReadingTime(value);
      setFormData(prev => ({ ...prev, reading_time: readingTime }));
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה בהעלאת התמונה');
      }

      setFormData(prev => ({ ...prev, image_url: result.url }));
      alert('התמונה הועלתה בהצלחה ל-Vercel Blob');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error instanceof Error ? error.message : 'שגיאה בהעלאת התמונה');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.title || !formData.slug || !formData.content) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('articles')
        .update({
          title: formData.title,
          slug: formData.slug,
          excerpt: formData.excerpt || formData.content.substring(0, 200),
          content: formData.content,
          image_url: formData.image_url,
          tags: formData.tags,
          is_published: formData.is_published,
          reading_time: formData.reading_time,
          updated_date: new Date().toISOString()
        })
        .eq('id', articleId);

      if (error) throw error;

      alert('המאמר עודכן בהצלחה!');
      router.push('/manage/articles');
    } catch (error: any) {
      console.error('Error updating article:', error);
      alert('שגיאה בעדכון המאמר: ' + (error.message || 'שגיאה לא ידועה'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">טוען מאמר...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="container mx-auto px-4 py-6">
          <Link href="/manage/articles" className="text-amber-600 hover:text-amber-700 text-sm mb-2 inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            חזרה לניהול מאמרים
          </Link>
          <h1 className="text-3xl font-bold text-stone-800">עריכת מאמר</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              כותרת המאמר *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
              placeholder="כותרת המאמר..."
              required
            />
          </div>

          {/* Slug */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Slug (כתובת URL) *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-stone-500 text-sm">niragabay.com/articles/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="article-slug"
                required
              />
            </div>
          </div>

          {/* Image */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              תמונת ראשית
            </label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              {uploading && <p className="text-amber-600 text-sm">מעלה תמונה...</p>}
              {formData.image_url && (
                <div className="mt-3">
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    className="w-full max-w-md rounded-lg border border-stone-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              תקציר (אופציונלי)
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              rows={3}
              placeholder="תקציר קצר של המאמר..."
            />
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              תוכן המאמר (Markdown) *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-sm"
              rows={20}
              placeholder="כתוב את המאמר כאן בפורמט Markdown..."
              required
            />
            <p className="text-stone-500 text-sm mt-2">
              תומך ב-Markdown: **מודגש**, *נטוי*, # כותרות, - רשימות, [קישור](url)
            </p>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              תגיות (מופרדות בפסיקים)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="חרדה, דיכאון, טיפול קוגניטיבי התנהגותי"
            />
          </div>

          {/* Reading Time */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              זמן קריאה (דקות)
            </label>
            <input
              type="number"
              value={formData.reading_time}
              onChange={(e) => handleChange('reading_time', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              min="1"
            />
          </div>

          {/* Publish Status */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => handleChange('is_published', e.target.checked)}
                className="w-5 h-5 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
              />
              <span className="font-medium text-stone-800">מאמר מפורסם</span>
            </label>
            <p className="text-stone-500 text-sm mt-2 mr-8">
              אם לא מסומן, המאמר יישמר כטיוטה
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
            
            <Link
              href="/manage/articles"
              className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
            >
              ביטול
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
