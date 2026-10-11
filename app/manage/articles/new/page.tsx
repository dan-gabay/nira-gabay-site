'use client';

import { useState, useEffect } from 'react';
import { dateToScheduleIso } from '@/lib/schedule';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import PageHeader from '@/components/manage/PageHeader';
import { ContentField, HeadFields, ImagePanel, MobileSaveBar, PublishPanel, TagsPanel } from '@/components/manage/ArticleEditorParts';

export default function NewArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
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
    loadTags();
  }, []);

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

  function toggleTag(tag: string) {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newSelectedTags);
    setFormData(prev => ({ ...prev, tags: newSelectedTags.join(', ') }));
  }

  function calculateReadingTime(text: string): number {
    // Calculate based on Hebrew text: ~1000 characters per minute
    const charCount = text.length;
    const minutes = Math.max(1, Math.ceil(charCount / 1000));
    return minutes;
  }

  function handleChange(field: string, value: string | boolean | number) {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate ASCII slug from title (strip Hebrew - user must type slug for Hebrew titles)
    if (field === 'title' && typeof value === 'string') {
      const slug = value
        .toLowerCase()
        .replace(/[\u0590-\u05FF\u200F\u200E]/g, '') // strip Hebrew characters
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .trim();
      if (slug) setFormData(prev => ({ ...prev, slug }));
    }
    
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

      const scheduledAt = formData.is_published
        ? null
        : dateToScheduleIso(formData.scheduled_publish_at);

      const articleData = {
        id: crypto.randomUUID(),
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || formData.content.substring(0, 200),
        content: formData.content,
        image_url: formData.image_url,
        tags: formData.tags,
        is_published: formData.is_published,
        reading_time: formData.reading_time,
        scheduled_publish_at: scheduledAt,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        likes_count: 0,
        views_count: 0
      };

      const { error } = await supabase
        .from('articles')
        .insert([articleData])
        .select()
        .single();

      if (error) throw error;

      alert('המאמר נשמר בהצלחה!');
      router.push('/manage/articles');
    } catch (error) {
      console.error('Error saving article:', error);
      alert('שגיאה בשמירת המאמר: ' + ((error as { message?: string })?.message || 'שגיאה לא ידועה'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="מאמר חדש"
        sub={
          <Link href="/manage/articles" className="hover:text-stone-800">
            מאמרים
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        <div className="space-y-4 md:space-y-5 min-w-0">
          <HeadFields
            title={formData.title}
            slug={formData.slug}
            excerpt={formData.excerpt}
            onChange={(f, v) => handleChange(f, v)}
          />
          <ContentField
            value={formData.content}
            readingTime={formData.reading_time}
            onChange={(v) => handleChange('content', v)}
          />
        </div>

        <aside className="mt-4 lg:mt-0 space-y-4 lg:sticky lg:top-6">
          <PublishPanel
            isPublished={formData.is_published}
            scheduledDate={formData.scheduled_publish_at}
            onPublishedChange={(v) => handleChange('is_published', v)}
            onScheduleChange={(v) => handleChange('scheduled_publish_at', v)}
            saving={saving}
            saveLabel="שמירת המאמר"
          />
          <ImagePanel
            url={formData.image_url}
            alt={formData.title ? `תמונת מאמר: ${formData.title}` : 'תצוגה מקדימה של תמונת המאמר'}
            uploading={uploading}
            onUpload={handleImageUpload}
          />
          <TagsPanel available={availableTags} selected={selectedTags} onToggle={toggleTag} />
        </aside>

        <MobileSaveBar saving={saving} label="שמירת המאמר" />
      </form>
    </>
  );
}
