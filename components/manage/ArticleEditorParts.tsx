'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { formatScheduleDate, todayLocalDate } from '@/lib/schedule';
import { Save, Clock, ImageOff, Upload, ChevronDown } from 'lucide-react';

// The pieces both article screens (new and edit) are built from, so they look
// and behave the same: the writing on the main column, and everything about
// publishing it - when, with which image, under which tags - in a side panel
// that stays in view on a laptop.

export function Panel({
  title,
  aside,
  children,
  className = '',
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-stone-200 ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 pt-4">
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          {aside}
        </div>
      )}
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

export const inputCls =
  'w-full px-3.5 min-h-[44px] rounded-xl border border-stone-300 bg-white text-sm focus:ring-2 focus:ring-stone-300 focus:border-stone-400 focus:outline-none';

export function Label({ htmlFor, children, aside }: { htmlFor: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center justify-between gap-2 text-[13px] font-medium text-stone-700 mb-1.5">
      <span>{children}</span>
      {aside}
    </label>
  );
}

/** Title, address and excerpt: what a reader sees before opening the article. */
export function HeadFields({
  title,
  slug,
  excerpt,
  onChange,
}: {
  title: string;
  slug: string;
  excerpt: string;
  onChange: (field: 'title' | 'slug' | 'excerpt', value: string) => void;
}) {
  return (
    <Panel>
      <label htmlFor="art-title" className="sr-only">
        כותרת המאמר
      </label>
      <input
        id="art-title"
        type="text"
        value={title}
        onChange={(e) => onChange('title', e.target.value)}
        placeholder="כותרת המאמר"
        required
        className="w-full text-xl md:text-2xl font-bold text-stone-900 placeholder:text-stone-300 border-0 p-0 focus:ring-0 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-1 text-[13px] text-stone-500 min-w-0" dir="ltr">
        <span className="flex-shrink-0">niragabay.com/articles/</span>
        <label htmlFor="art-slug" className="sr-only">
          כתובת המאמר
        </label>
        <input
          id="art-slug"
          type="text"
          value={slug}
          onChange={(e) => onChange('slug', e.target.value)}
          placeholder="article-slug"
          required
          className="flex-1 min-w-0 px-2 min-h-[32px] rounded-lg border border-transparent hover:border-stone-200 focus:border-stone-300 bg-stone-50 text-stone-800 focus:ring-0 focus:outline-none"
        />
      </div>

      <div className="mt-4 pt-4 border-t border-stone-100">
        <Label htmlFor="art-excerpt" aside={<span className="text-[11px] text-stone-400 font-normal">לא חובה</span>}>
          תקציר
        </Label>
        <textarea
          id="art-excerpt"
          value={excerpt}
          onChange={(e) => onChange('excerpt', e.target.value)}
          rows={2}
          placeholder="שתיים-שלוש שורות שמופיעות ברשימת המאמרים. ריק = תחילת המאמר."
          className={`${inputCls} py-2.5`}
        />
      </div>
    </Panel>
  );
}

export function ContentField({
  value,
  readingTime,
  onChange,
}: {
  value: string;
  readingTime: number;
  onChange: (v: string) => void;
}) {
  return (
    <Panel
      title="תוכן המאמר"
      aside={
        <span className="text-[11px] text-stone-400 tabular-nums">
          {value.length.toLocaleString('he-IL')} תווים · כ-{readingTime} דק׳ קריאה
        </span>
      }
    >
      <label htmlFor="art-content" className="sr-only">
        תוכן המאמר (Markdown)
      </label>
      <textarea
        id="art-content"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={24}
        required
        placeholder="כתבי כאן את המאמר. ## לכותרת משנה, **מודגש**, - לרשימה."
        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white text-[15px] leading-relaxed focus:ring-2 focus:ring-stone-300 focus:outline-none"
      />
      <p className="text-[11px] text-stone-400 mt-2">הפורמט הוא Markdown.</p>
    </Panel>
  );
}

type PublishMode = 'draft' | 'scheduled' | 'published';

/**
 * When the article goes live, and the save button. Three states as one
 * choice: a draft, a date, or now. The underlying fields are unchanged:
 * is_published and scheduled_publish_at, and choosing "now" clears the date.
 */
export function PublishPanel({
  isPublished,
  scheduledDate,
  onPublishedChange,
  onScheduleChange,
  saving,
  saveLabel,
  previewHref,
}: {
  isPublished: boolean;
  scheduledDate: string;
  onPublishedChange: (v: boolean) => void;
  onScheduleChange: (v: string) => void;
  saving: boolean;
  saveLabel: string;
  previewHref?: string | null;
}) {
  const [mode, setMode] = useState<PublishMode>(isPublished ? 'published' : scheduledDate ? 'scheduled' : 'draft');

  const choose = (m: PublishMode) => {
    setMode(m);
    if (m === 'published') {
      onPublishedChange(true);
      onScheduleChange('');
    } else {
      onPublishedChange(false);
      if (m === 'draft') onScheduleChange('');
    }
  };

  const MODES: Array<{ key: PublishMode; label: string }> = [
    { key: 'draft', label: 'טיוטה' },
    { key: 'scheduled', label: 'מתוזמן' },
    { key: 'published', label: 'מפורסם' },
  ];

  return (
    <Panel title="פרסום">
      <div role="radiogroup" aria-label="מצב פרסום" className="grid grid-cols-3 bg-stone-100 rounded-xl p-1 gap-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={mode === m.key}
            onClick={() => choose(m.key)}
            className={`min-h-[36px] rounded-lg text-[13px] font-medium transition-colors ${
              mode === m.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'scheduled' && (
        <div className="mt-3">
          <label htmlFor="art-schedule" className="sr-only">
            תאריך פרסום
          </label>
          <input
            id="art-schedule"
            type="date"
            value={scheduledDate}
            onChange={(e) => onScheduleChange(e.target.value)}
            min={todayLocalDate()}
            dir="ltr"
            className={inputCls}
          />
          <p className="text-xs text-sky-700 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {scheduledDate ? `יפורסם ב-${formatScheduleDate(scheduledDate)}, בבוקר` : 'בחרי תאריך'}
          </p>
        </div>
      )}
      <p className="text-xs text-stone-500 mt-3">
        {mode === 'draft' && 'לא מופיע באתר עד שיפורסם.'}
        {mode === 'published' && 'מופיע באתר מיד עם השמירה.'}
      </p>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-sm font-medium transition-colors"
      >
        <Save className="w-4 h-4" aria-hidden="true" />
        {saving ? 'שומר...' : saveLabel}
      </button>
      <div className="mt-2 flex items-center justify-between text-[13px]">
        <Link href="/manage/articles" className="text-stone-500 hover:text-stone-800 min-h-[36px] inline-flex items-center">
          ביטול
        </Link>
        {previewHref && (
          <a href={previewHref} target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-800 min-h-[36px] inline-flex items-center">
            תצוגה מקדימה
          </a>
        )}
      </div>
    </Panel>
  );
}

export function ImagePanel({
  url,
  alt,
  uploading,
  onUpload,
  children,
}: {
  url: string;
  alt: string;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: ReactNode;
}) {
  return (
    <Panel title="תמונה ראשית">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- an arbitrary uploaded URL, previewed as is
        <img src={url} alt={alt} className="w-full aspect-[16/10] object-cover rounded-xl border border-stone-200" />
      ) : (
        <div className="w-full aspect-[16/10] rounded-xl border border-dashed border-stone-300 bg-stone-50 flex flex-col items-center justify-center gap-1.5 text-stone-400 text-xs">
          <ImageOff className="w-5 h-5" aria-hidden="true" />
          אין תמונה עדיין
        </div>
      )}
      <label
        className={`mt-3 w-full inline-flex items-center justify-center gap-2 min-h-[40px] rounded-xl border border-stone-300 text-[13px] font-medium text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors ${
          uploading ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <Upload className="w-4 h-4" aria-hidden="true" />
        {uploading ? 'מעלה...' : url ? 'החלפת תמונה' : 'העלאת תמונה'}
        <input type="file" accept="image/*" onChange={onUpload} disabled={uploading} className="sr-only" />
      </label>
      {children}
    </Panel>
  );
}

export function TagsPanel({
  available,
  selected,
  onToggle,
}: {
  available: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <Panel title="תגיות" aside={<span className="text-[11px] text-stone-400">{selected.length} נבחרו</span>}>
      {available.length === 0 ? (
        <p className="text-xs text-stone-400">אין תגיות. אפשר להוסיף בלשונית תגיות.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {available.map((tag) => {
            const on = selected.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(tag)}
                className={`px-3 min-h-[32px] rounded-full text-[13px] font-medium transition-colors ${
                  on ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/** A closed-by-default part of a panel, for what is looked at once in a while. */
export function Fold({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <details className="group mt-4 pt-3 border-t border-stone-100">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between gap-2 min-h-[36px] text-[13px] font-medium text-stone-700">
        <span className="flex items-center gap-2">
          {title}
          {aside}
        </span>
        <ChevronDown className="w-4 h-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

/** The phone's save bar: the side panel is below the whole article there. */
export function MobileSaveBar({ saving, label }: { saving: boolean; label: string }) {
  return (
    <div className="lg:hidden sticky bottom-20 z-30 mt-4 flex gap-2 bg-white/95 backdrop-blur border border-stone-200 rounded-2xl p-2 shadow-lg">
      <button
        type="submit"
        disabled={saving}
        className="flex-1 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white min-h-[46px] rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
      >
        <Save className="w-4 h-4" aria-hidden="true" />
        {saving ? 'שומר...' : label}
      </button>
      <Link
        href="/manage/articles"
        className="min-h-[46px] px-5 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl text-sm font-medium inline-flex items-center justify-center"
      >
        ביטול
      </Link>
    </div>
  );
}
