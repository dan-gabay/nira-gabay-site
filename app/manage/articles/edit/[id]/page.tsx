'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ArrowRight, Save, Copy, Check, ImageOff, Clock, X } from 'lucide-react';

type DraftMetadata = {
  image_concept: string | null;
  image_prompt: string | null;
  negative_prompt: string | null;
  image_alt: string | null;
  image_status: string;
};

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [draftMetadata, setDraftMetadata] = useState<DraftMetadata | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image_url: '',
    tags: '',
    is_published: false,
    reading_time: 5,
    scheduled_publish_at: '',
  });

  useEffect(() => {
    loadArticle();
    loadTags();
  }, [articleId]);

  async function loadTags() {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('name')
        .order('name');

      if (error) throw error;
      setAvailableTags(data.map(t => t.name));
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  async function loadArticle() {
    try {
      const [articleRes, metaRes] = await Promise.all([
        supabase
          .from('articles')
          .select('*')
          .eq('id', articleId)
          .single(),
        supabase
          .from('article_draft_metadata')
          .select('image_concept, image_prompt, negative_prompt, image_alt, image_status')
          .eq('article_id', articleId)
          .maybeSingle(),
      ]);

      if (articleRes.error) throw articleRes.error;

      const data = articleRes.data;
      const tags = data.tags || '';
      const tagsArray = tags ? tags.split(',').map((t: string) => t.trim()) : [];

      // Convert ISO timestamp to datetime-local format (YYYY-MM-DDTHH:mm)
      const scheduledRaw = data.scheduled_publish_at ?? '';
      const scheduledLocal = scheduledRaw
        ? new Date(scheduledRaw).toISOString().slice(0, 16)
        : '';

      setFormData({
        title: data.title || '',
        slug: data.slug || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        image_url: data.image_url || '',
        tags: tags,
        is_published: data.is_published || false,
        reading_time: data.reading_time || 5,
        scheduled_publish_at: scheduledLocal,
      });

      setSelectedTags(tagsArray);
      setDraftMetadata(metaRes.data ?? null);
    } catch (error) {
      console.error('Error loading article:', error);
      alert('שגיאה בטעינת המאמר');
      router.push('/manage/articles');
    } finally {
      setLoading(false);
    }
  }

  function toggleTag(tag: string) {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(newSelectedTags);
    setFormData(prev => ({ ...prev, tags: newSelectedTags.join(', ') }));
  }

  function calculateReadingTime(text: string): number {
    const charCount = text.length;
    const minutes = Math.max(1, Math.ceil(charCount / 1000));
    return minutes;
  }

  function handleChange(field: string, value: string | boolean | number) {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'content' && typeof value === 'string') {
      const readingTime = calculateReadingTime(value);
      setFormData(prev => ({ ...prev, reading_time: readingTime }));
    }
  }

  async function copyToClipboard(text: string, fieldKey: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      console.error('Copy failed');
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

      // When publishing immediately, clear the schedule
      const scheduledAt = formData.is_published
        ? null
        : (formData.scheduled_publish_at ? new Date(formData.scheduled_publish_at).toISOString() : null);

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
          scheduled_publish_at: scheduledAt,
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
              {formData.image_url ? (
                <div className="mt-3">
                  <img
                    src={formData.image_url}
                    alt={formData.title ? `תמונת מאמר: ${formData.title}` : "תצוגה מקדימה של תמונת המאמר"}
                    className="w-full max-w-md rounded-lg border border-stone-200"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-stone-500 text-sm bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
                  <ImageOff className="w-4 h-4 flex-shrink-0" />
                  אין תמונה ראשית מצורפת עדיין
                </div>
              )}
            </div>
          </div>

          {/* Image Prompt Metadata - admin only, never shown on public page */}
          {(draftMetadata || !formData.image_url) && (
            <div className="bg-amber-50 rounded-xl p-6 shadow-sm border border-amber-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-stone-800">פרטי תמונה (לשימוש פנימי בלבד)</h2>
                {draftMetadata?.image_status && (
                  <span className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded-full font-medium">
                    {draftMetadata.image_status}
                  </span>
                )}
              </div>

              {draftMetadata ? (
                <div className="space-y-5">
                  {draftMetadata.image_concept && (
                    <div>
                      <p className="text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wide">רעיון לתמונה</p>
                      <p className="text-sm text-stone-700 bg-white border border-amber-100 rounded-lg px-4 py-3">
                        {draftMetadata.image_concept}
                      </p>
                    </div>
                  )}

                  {draftMetadata.image_prompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">פרומפט לתמונה</p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(draftMetadata.image_prompt!, 'prompt')}
                          className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {copiedField === 'prompt' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedField === 'prompt' ? 'הועתק!' : 'העתק פרומפט'}
                        </button>
                      </div>
                      <p className="text-sm text-stone-600 bg-white border border-amber-100 rounded-lg px-4 py-3 font-mono leading-relaxed text-left" dir="ltr">
                        {draftMetadata.image_prompt}
                      </p>
                    </div>
                  )}

                  {draftMetadata.negative_prompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">פרומפט שלילי</p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(draftMetadata.negative_prompt!, 'negative')}
                          className="flex items-center gap-1.5 text-xs bg-stone-500 hover:bg-stone-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {copiedField === 'negative' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedField === 'negative' ? 'הועתק!' : 'העתק'}
                        </button>
                      </div>
                      <p className="text-xs text-stone-500 bg-white border border-amber-100 rounded-lg px-4 py-3 font-mono leading-relaxed text-left" dir="ltr">
                        {draftMetadata.negative_prompt}
                      </p>
                    </div>
                  )}

                  {draftMetadata.image_alt && (
                    <div>
                      <p className="text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wide">טקסט חלופי לתמונה (alt)</p>
                      <p className="text-sm text-stone-700 bg-white border border-amber-100 rounded-lg px-4 py-3">
                        {draftMetadata.image_alt}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-stone-400 mt-2">
                    השתמש בפרומפט זה ב-Midjourney, DALL-E, או כלי יצירת תמונות אחר. לאחר יצירת התמונה, העלה אותה בשדה "תמונת ראשית" למעלה.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-stone-500">אין פרטי תמונה שמורים עדיין לטיוטה זו</p>
              )}
            </div>
          )}

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
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
            <label className="block text-sm font-medium text-stone-700 mb-3">
              תגיות (בחר מהרשימה)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-stone-600 text-sm mt-3">
                תגיות נבחרות: {selectedTags.join(', ')}
              </p>
            )}
          </div>

          {/* Publish Status */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 space-y-4">
            <p className="text-sm font-semibold text-stone-700">סטטוס פרסום</p>

            {/* Publish now */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => {
                  handleChange('is_published', e.target.checked);
                  if (e.target.checked) handleChange('scheduled_publish_at', '');
                }}
                className="w-5 h-5 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
              />
              <span className="font-medium text-stone-800">פרסם עכשיו</span>
            </label>

            {/* Schedule - only when not published */}
            {!formData.is_published && (
              <div className="border-t border-stone-100 pt-4">
                <p className="text-sm font-medium text-stone-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  תזמן פרסום אוטומטי
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={formData.scheduled_publish_at}
                    onChange={(e) => handleChange('scheduled_publish_at', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    dir="ltr"
                  />
                  {formData.scheduled_publish_at && (
                    <button
                      type="button"
                      onClick={() => handleChange('scheduled_publish_at', '')}
                      className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                      title="בטל תיזמון"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {formData.scheduled_publish_at && (
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    יפורסם ב-{new Date(formData.scheduled_publish_at).toLocaleString('he-IL', { dateStyle: 'long', timeStyle: 'short' })}
  </p>
                )}
                {!formData.scheduled_publish_at && (
                  <p className="text-xs text-stone-400 mt-2">השאר ריק כדי לשמור כטיוטה</p>
                )}
              </div>
            )}
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
