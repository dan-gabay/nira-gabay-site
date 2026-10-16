'use client';

import { useEffect, useState } from 'react';
import { dateToScheduleIso, scheduleIsoToDate } from '@/lib/schedule';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { deleteArticleImage, uploadArticleImage } from '@/lib/articleImage';
import Link from 'next/link';
import ArticleGoogle from '@/components/manage/ArticleGoogle';
import { Copy, Check } from 'lucide-react';
import PageHeader from '@/components/manage/PageHeader';
import {
  ContentField,
  Fold,
  HeadFields,
  ImagePanel,
  Label,
  MobileSaveBar,
  Panel,
  PublishPanel,
  TagsPanel,
  inputCls,
} from '@/components/manage/ArticleEditorParts';

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
  // The image_url stored in the database, to delete it once a replacement is saved.
  const [savedImageUrl, setSavedImageUrl] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [draftMetadata, setDraftMetadata] = useState<DraftMetadata | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

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
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
  });

  type SeoFinding = { id: string; severity: 'error' | 'warn' | 'info'; message: string };
  type InternalLink = { slug: string; title: string; anchor?: string; reason?: string };
  const [seoReview, setSeoReview] = useState<{
    score: number | null;
    findings: SeoFinding[];
    internalLinks: InternalLink[];
    faqCount: number;
    secondaryKeywords: string[];
    canonicalUrl: string | null;
  } | null>(null);

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

      // The stored instant becomes the date the admin picked, in their own
      // timezone. The old code used toISOString() here, which showed the UTC
      // date and so read a day early for anyone east of UTC.
      const scheduledLocal = scheduleIsoToDate(data.scheduled_publish_at);

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
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        focus_keyword: data.focus_keyword || '',
      });

      setSavedImageUrl(data.image_url || '');

      // Google data is only asked for the stored, published slug, not for
      // whatever is in the form while editing.
      setPublishedSlug(data.is_published && data.slug ? data.slug : null);

      // SEO review (read-only) from the generated package + validation.
      const pkg = data.seo_package || {};
      const faqEntries = data.faq?.mainEntity;
      setSeoReview({
        score: typeof data.seo_score === 'number' ? data.seo_score : null,
        findings: Array.isArray(pkg.findings) ? pkg.findings : [],
        internalLinks: Array.isArray(data.internal_links) ? data.internal_links : [],
        faqCount: Array.isArray(faqEntries) ? faqEntries.length : 0,
        secondaryKeywords: Array.isArray(data.secondary_keywords) ? data.secondary_keywords : [],
        canonicalUrl: data.canonical_url || null,
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
    const input = e.currentTarget;
    const file = input.files?.[0];
    // Cleared so that picking the same file again still counts as a change.
    input.value = '';
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadArticleImage(file);
      const previous = formData.image_url;
      setFormData(prev => ({ ...prev, image_url: url }));
      // A file uploaded earlier in this visit and never saved is used by nothing.
      if (previous && previous !== savedImageUrl) deleteArticleImage(previous);
    } catch (error) {
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
        : dateToScheduleIso(formData.scheduled_publish_at);

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
          meta_title: formData.meta_title || null,
          meta_description: formData.meta_description || null,
          focus_keyword: formData.focus_keyword || null,
          updated_date: new Date().toISOString()
        })
        .eq('id', articleId);

      if (error) throw error;

      // The replaced image is no longer used by this article.
      if (savedImageUrl && savedImageUrl !== formData.image_url) {
        await deleteArticleImage(savedImageUrl);
      }

      alert('המאמר עודכן בהצלחה!');
      router.push('/manage/articles');
    } catch (error) {
      console.error('Error updating article:', error);
      alert('שגיאה בעדכון המאמר: ' + ((error as { message?: string })?.message || 'שגיאה לא ידועה'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="עריכת מאמר" />
        <div className="py-20 text-center text-stone-500 text-sm">טוען מאמר...</div>
      </>
    );
  }

  const previewHref = formData.slug
    ? publishedSlug
      ? `/articles/${publishedSlug}`
      : `/api/preview?secret=${process.env.NEXT_PUBLIC_PREVIEW_SECRET}&slug=${formData.slug}`
    : null;
  const shownFindings = seoReview?.findings.filter((f) => f.severity !== 'info') ?? [];
  const score = seoReview?.score ?? null;

  return (
    <>
      <PageHeader
        title="עריכת מאמר"
        sub={
          <Link href="/manage/articles" className="hover:text-stone-800">
            מאמרים
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        {/* ── The writing ─────────────────────────────────────── */}
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

          {/* ── How it shows in Google ────────────────────────── */}
          <Panel
            title="איך זה נראה בגוגל"
            aside={
              score !== null && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full tabular-nums ${
                    score >= 80
                      ? 'bg-emerald-100 text-emerald-800'
                      : score >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  ציון SEO {score}/100
                </span>
              )
            }
          >
            {/* A search result, as Google would draw it from these fields */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-3 mb-4">
              <p className="text-[12px] text-stone-500 truncate" dir="ltr">
                niragabay.com › articles › {formData.slug || '...'}
              </p>
              <p className="text-[17px] text-[#1a0dab] leading-snug mt-0.5 line-clamp-1">
                {formData.meta_title || formData.title || 'כותרת המאמר'}
              </p>
              <p className="text-[13px] text-stone-600 leading-relaxed mt-0.5 line-clamp-2">
                {formData.meta_description || formData.excerpt || 'תיאור קצר לתוצאות החיפוש'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="seo-title"
                  aside={
                    <span className={`text-[11px] tabular-nums ${formData.meta_title.length > 60 ? 'text-rose-600' : 'text-stone-400'}`}>
                      {formData.meta_title.length}/60
                    </span>
                  }
                >
                  כותרת לגוגל
                </Label>
                <input
                  id="seo-title"
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => handleChange('meta_title', e.target.value)}
                  className={inputCls}
                  placeholder="ריק = כותרת המאמר"
                />
              </div>
              <div>
                <Label
                  htmlFor="seo-desc"
                  aside={
                    <span
                      className={`text-[11px] tabular-nums ${
                        formData.meta_description.length > 158 ||
                        (formData.meta_description.length > 0 && formData.meta_description.length < 120)
                          ? 'text-amber-600'
                          : 'text-stone-400'
                      }`}
                    >
                      {formData.meta_description.length}/158
                    </span>
                  }
                >
                  תיאור לגוגל
                </Label>
                <textarea
                  id="seo-desc"
                  value={formData.meta_description}
                  onChange={(e) => handleChange('meta_description', e.target.value)}
                  className={`${inputCls} py-2.5`}
                  rows={2}
                  placeholder="120-158 תווים"
                />
              </div>
              <div>
                <Label htmlFor="seo-kw">מילת מפתח ראשית</Label>
                <input
                  id="seo-kw"
                  type="text"
                  value={formData.focus_keyword}
                  onChange={(e) => handleChange('focus_keyword', e.target.value)}
                  className={inputCls}
                  placeholder="לדוגמה: הדרכת הורים"
                />
                {seoReview && seoReview.secondaryKeywords.length > 0 && (
                  <p className="text-xs text-stone-500 mt-1.5">משניות: {seoReview.secondaryKeywords.join(', ')}</p>
                )}
              </div>
            </div>

            {shownFindings.length > 0 && (
              <Fold
                title="בדיקות SEO"
                aside={<span className="text-[11px] font-normal text-stone-400">{shownFindings.length}</span>}
              >
                <ul className="space-y-1.5">
                  {shownFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px]">
                      <span
                        className={`mt-1.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                          f.severity === 'error' ? 'bg-rose-500' : 'bg-amber-400'
                        }`}
                      />
                      <span className={f.severity === 'error' ? 'text-rose-700' : 'text-stone-600'}>{f.message}</span>
                    </li>
                  ))}
                </ul>
              </Fold>
            )}

            {seoReview && seoReview.internalLinks.length > 0 && (
              <Fold
                title="הצעות לקישור פנימי"
                aside={<span className="text-[11px] font-normal text-stone-400">{seoReview.internalLinks.length}</span>}
              >
                <ul className="space-y-1">
                  {seoReview.internalLinks.map((l, i) => (
                    <li key={i} className="text-[13px]">
                      <Link href={`/articles/${l.slug}`} target="_blank" className="text-stone-800 underline underline-offset-2">
                        {l.anchor || l.title}
                      </Link>
                      {l.reason && <span className="text-stone-400 text-xs"> - {l.reason}</span>}
                    </li>
                  ))}
                </ul>
              </Fold>
            )}

            {(seoReview?.faqCount || seoReview?.canonicalUrl) && (
              <p className="text-[11px] text-stone-400 mt-4">
                {seoReview?.faqCount ? `${seoReview.faqCount} שאלות FAQ נשמרו כ-schema. ` : ''}
                {seoReview?.canonicalUrl && (
                  <span dir="ltr">canonical: {seoReview.canonicalUrl}</span>
                )}
              </p>
            )}

            <ArticleGoogle slug={publishedSlug} />
          </Panel>
        </div>

        {/* ── Publishing ──────────────────────────────────────── */}
        <aside className="mt-4 lg:mt-0 space-y-4 lg:sticky lg:top-6">
          <PublishPanel
            isPublished={formData.is_published}
            scheduledDate={formData.scheduled_publish_at}
            onPublishedChange={(v) => handleChange('is_published', v)}
            onScheduleChange={(v) => handleChange('scheduled_publish_at', v)}
            saving={saving}
            saveLabel="שמירת שינויים"
            previewHref={previewHref}
          />

          <ImagePanel
            url={formData.image_url}
            alt={formData.title ? `תמונת מאמר: ${formData.title}` : 'תצוגה מקדימה של תמונת המאמר'}
            uploading={uploading}
            onUpload={handleImageUpload}
          >
            {/* Image prompt metadata - admin only, never shown on the public page */}
            {draftMetadata && (
              <Fold
                title="פרומפט לתמונה"
                aside={
                  draftMetadata.image_status && (
                    <span className="text-[11px] font-normal bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      {draftMetadata.image_status}
                    </span>
                  )
                }
              >
                <div className="space-y-3 text-[13px]">
                  {draftMetadata.image_concept && <p className="text-stone-700">{draftMetadata.image_concept}</p>}
                  {draftMetadata.image_prompt && (
                    <CopyBlock
                      label="פרומפט"
                      text={draftMetadata.image_prompt}
                      copied={copiedField === 'prompt'}
                      onCopy={() => copyToClipboard(draftMetadata.image_prompt!, 'prompt')}
                    />
                  )}
                  {draftMetadata.negative_prompt && (
                    <CopyBlock
                      label="פרומפט שלילי"
                      text={draftMetadata.negative_prompt}
                      copied={copiedField === 'negative'}
                      onCopy={() => copyToClipboard(draftMetadata.negative_prompt!, 'negative')}
                    />
                  )}
                  {draftMetadata.image_alt && (
                    <p className="text-stone-600">
                      <span className="text-stone-400">טקסט חלופי: </span>
                      {draftMetadata.image_alt}
                    </p>
                  )}
                  <p className="text-[11px] text-stone-400">
                    להדבקה בכלי ליצירת תמונות. אחרי שהתמונה מוכנה, להעלות אותה כאן למעלה.
                  </p>
                </div>
              </Fold>
            )}
          </ImagePanel>

          <TagsPanel available={availableTags} selected={selectedTags} onToggle={toggleTag} />
        </aside>

        <MobileSaveBar saving={saving} label="שמירת שינויים" />
      </form>
    </>
  );
}

function CopyBlock({ label, text, copied, onCopy }: { label: string; text: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium text-stone-500">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-stone-700 hover:text-stone-900 min-h-[32px] px-2 rounded-lg hover:bg-stone-100"
        >
          {copied ? <Check className="w-3 h-3" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
          {copied ? 'הועתק' : 'העתקה'}
        </button>
      </div>
      <p className="text-[12px] text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 font-mono leading-relaxed text-left max-h-32 overflow-y-auto" dir="ltr">
        {text}
      </p>
    </div>
  );
}
