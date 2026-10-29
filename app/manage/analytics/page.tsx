'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import PageHeader from '@/components/manage/PageHeader';
import {
  SourceBars,
  SOURCE_SERIES,
  bucketKeys,
  fillDays,
  fillHours,
  fillSeries,
} from '@/components/manage/Charts';
import { GROUP_LABELS } from '@/components/manage/TrafficSources';
import OrganicSearchCard, { type OrganicSearch } from '@/components/manage/OrganicSearch';
import type { GoogleAds, GoogleSearch } from '@/lib/google/types';
import GoogleSection from '@/components/manage/analytics/GoogleSection';
import ArticleEngagementCard, { type ArticleEngagement } from '@/components/manage/ArticleEngagement';
import { buildInsights } from '@/lib/analyticsInsights';
import { BOT_KIND_LABELS, type StoredBotKind } from '@/lib/botDetect';
import { Card, Disclosure, Empty, FoldedSection, Section, Segmented } from '@/components/manage/analytics/ui';
import { serviceName } from '@/components/manage/analytics/labels';
import { Overview, heDate } from '@/components/manage/analytics/Overview';
import { Enquiries } from '@/components/manage/analytics/Enquiries';
import { SourcesTable } from '@/components/manage/analytics/SourcesTable';
import { PagesTable } from '@/components/manage/analytics/PagesTable';
import { AudienceSection } from '@/components/manage/analytics/AudienceSection';
import { AiSection } from '@/components/manage/analytics/AiSection';
import GeoSection from '@/components/manage/analytics/GeoSection';
import { VisitDepth } from '@/components/manage/analytics/VisitDepth';
import { Trends } from '@/components/manage/analytics/Trends';
import type { EnquiryRow, LeadOutcomes, Payload, SiteBehavior } from '@/components/manage/analytics/types';

// The full analytics, read as a chain of questions:
//
//   1. תמונת מצב  - is it working? Four figures, what they mean, their shape.
//      מגמות     - is it getting better? Week by week, whatever the range.
//   2. לחיצות     - what produced the taps on contact, down to each one.
//   3. מקורות     - which traffic is worth having.
//   4. גוגל       - what an enquiry from the ads costs, and where organic
//                   search is missing (live from Google, see lib/google).
//   5. עמודים     - which pages turn a visit into an enquiry, and how deep
//                   a visit goes.
//   6. מאמרים     - whether the content is read.
//   7. כלי AI     - whether AI tools read the site, and answer from it.
//   8. קהל        - who the visitors are and when they come.
//
// It replaced about twenty flat cards in which the same data appeared up to
// three times (landing pages, source quality, enquiries per day). Every section
// here answers one question, and a figure that did not help answer one was
// cut rather than given a card of its own.
//
// The eight sections are one continuous scroll, grouped under four parts
// (PARTS). The part menu stays under the admin header: it marks the part being
// read as the page scrolls, and a tap on it jumps to that part. A part's or a
// section's id in the URL hash (#content, #google...) opens the page there.

// Seven calls, not one: the main payload, plus article engagement, organic
// search, the enquiry log, site behaviour (AI tools, visit depth) and the two
// Google routes, each its own call so that one failing leaves the
// rest of the page standing. Each result is stored with the range it was asked
// for, and "loading" is derived by comparing that to the selected range - no
// setState in an effect body, and the previous range stays on screen, dimmed,
// until the new one lands.

const RANGES = [
  { value: 1, label: '24 שעות' },
  { value: 7, label: '7 ימים' },
  { value: 30, label: '30 יום' },
  { value: 90, label: '90 יום' },
];

type PartId = 'summary' | 'sources' | 'content' | 'audience';

const PARTS: Array<{ value: PartId; label: string; sections: string[] }> = [
  { value: 'summary', label: 'סיכום', sections: ['overview', 'trends', 'enquiries'] },
  { value: 'sources', label: 'מקורות וגוגל', sections: ['sources', 'google'] },
  { value: 'content', label: 'תוכן', sections: ['pages', 'articles', 'ai'] },
  { value: 'audience', label: 'קהל', sections: ['audience'] },
];

// Two parts share their name with their first section (sources, audience),
// so a part's element is `part-<id>` and the hash keeps the bare name.
const partEl = (p: PartId) => document.getElementById(`part-${p}`);

/** The element a hash names (a part or a section), when it is on the page. */
function hashTarget(): HTMLElement | null {
  const h = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if (!h) return null;
  return document.getElementById(`part-${h}`) ?? document.getElementById(h);
}

/**
 * The part being read, from where the parts sit under the sticky bar, and a
 * jump to a part. While a jump scrolls, the spy holds the part that was tapped
 * rather than lighting each part it passes on the way.
 */
function usePartSpy(ready: boolean): [PartId, (p: PartId) => void] {
  const [active, setActive] = useState<PartId>('summary');
  const lockUntil = useRef(0);

  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (Date.now() < lockUntil.current) return;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current: PartId = PARTS[0].value;
      for (const p of PARTS) {
        // A part is being read once its top has reached where a jump to it
        // would put it: its scroll margin, which clears the sticky bar.
        const el = partEl(p.value);
        if (el && el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop) <= 24) {
          current = p.value;
        }
      }
      if (atBottom) current = PARTS[PARTS.length - 1].value;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const release = () => {
      lockUntil.current = 0;
      onScroll();
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('scrollend', release);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scrollend', release);
    };
  }, [ready]);

  // A link to a part or a section opens there once the figures are drawn: the
  // browser's own jump fires before they load, when the page is still empty.
  useEffect(() => {
    if (!ready) return;
    const jump = () => hashTarget()?.scrollIntoView({ block: 'start' });
    jump();
    window.addEventListener('hashchange', jump);
    return () => window.removeEventListener('hashchange', jump);
  }, [ready]);

  const jumpTo = (p: PartId) => {
    setActive(p);
    window.history.replaceState(null, '', `#${p}`);
    const el = partEl(p);
    if (!el) return;
    // A fallback for browsers without scrollend.
    lockUntil.current = Date.now() + 1000;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };
  return [active, jumpTo];
}

type Loaded<T> = { range: number; data: T | null; failed?: boolean };

function useRangeFetch<T>(url: string, range: number): Loaded<T> | null {
  const [state, setState] = useState<Loaded<T> | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`${url}?range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((d: T) => { if (live) setState({ range, data: d }); })
      .catch(() => { if (live) setState({ range, data: null, failed: true }); });
    return () => { live = false; };
  }, [url, range]);
  return state;
}

export default function AnalyticsPage() {
  // 24 hours by default (Dan, 2026-10-16): the page is opened to see what
  // happened since yesterday, and the home screen (/manage/overview) already
  // gives the month. A longer range is one tap away.
  const [range, setRange] = useState(1);
  const main = useRangeFetch<Payload>('/api/manage/analytics', range);
  const articlesRes = useRangeFetch<ArticleEngagement>('/api/manage/article-engagement', range);
  const organicRes = useRangeFetch<OrganicSearch>('/api/manage/organic-search', range);
  const googleSearchRes = useRangeFetch<GoogleSearch>('/api/manage/google/search', range);
  const googleAdsRes = useRangeFetch<GoogleAds>('/api/manage/google/ads', range);
  const logRes = useRangeFetch<EnquiryRow[]>('/api/manage/enquiry-log', range);
  const behaviorRes = useRangeFetch<SiteBehavior>('/api/manage/site-behavior', range);
  const outcomesRes = useRangeFetch<LeadOutcomes>('/api/manage/lead-outcomes', range);

  const loading = !main || main.range !== range;
  const failed = !loading && Boolean(main?.failed);
  const data = main?.data ?? null;
  // The optional payloads are shown only when they were built for the range
  // the main payload is showing, so the page never mixes two ranges. A failed
  // log reads as an empty one rather than as loading forever.
  const shownRange = main?.range;
  const articles = articlesRes?.range === shownRange ? articlesRes?.data ?? null : null;
  const organic = organicRes?.range === shownRange ? organicRes?.data ?? null : null;
  const googleSearch = googleSearchRes?.range === shownRange ? googleSearchRes?.data ?? null : null;
  const googleSearchFailed = googleSearchRes?.range === shownRange && Boolean(googleSearchRes?.failed);
  const googleAds = googleAdsRes?.range === shownRange ? googleAdsRes?.data ?? null : null;
  const googleAdsFailed = googleAdsRes?.range === shownRange && Boolean(googleAdsRes?.failed);
  const log =
    logRes?.range === shownRange ? (logRes?.data ?? (logRes?.failed ? [] : null)) : null;
  const behavior = behaviorRes?.range === shownRange ? behaviorRes?.data ?? null : null;
  const behaviorFailed = behaviorRes?.range === shownRange && Boolean(behaviorRes?.failed);
  const outcomes = outcomesRes?.range === shownRange ? outcomesRes?.data ?? null : null;

  const [part, setPart] = usePartSpy(Boolean(data) && !failed);

  const isHourly = data?.granularity === 'hour';
  const rangeLabel = isHourly ? '24 השעות האחרונות' : `${data?.range_days ?? range} הימים האחרונים`;

  return (
    <div className="space-y-6 md:space-y-10">
      <PageHeader title="נתונים" sub="נמדד ישירות באתר, בלי גוגל אנליטיקס. אנשים בלבד, בלי בוטים." />

      {/* The range and the part menu stay under the admin header while
          scrolling: they are the only two controls on the page. */}
      <div className="sticky top-14 lg:top-0 z-30 -mx-4 md:-mx-6 lg:-mx-10 px-4 md:px-6 lg:px-10 py-2 bg-stone-100/95 backdrop-blur-sm border-b border-stone-200/80 !mt-3">
        <div className="md:flex md:items-center md:gap-4">
          <div className="md:w-[380px] md:flex-shrink-0">
            <Segmented label="טווח זמן" options={RANGES} value={range} onChange={setRange} />
          </div>
          <div className="mt-2 md:mt-0 md:flex-1 md:max-w-[460px]">
            <Segmented label="חלק בעמוד" options={PARTS} value={part} onChange={setPart} size="sm" />
          </div>
        </div>
      </div>

      {!data && !failed && <p className="text-sm text-stone-400">טוען...</p>}

      {failed && (
        <div className="bg-white rounded-2xl border border-rose-200 p-4 text-sm text-stone-700">
          לא הצלחתי לטעון את הנתונים. נסה לרענן.
        </div>
      )}

      {data && !failed && (
        <div
          className={`space-y-8 md:space-y-12 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          aria-busy={loading}
        >
          <Dashboard
            data={data}
            articles={articles}
            organic={organic}
            googleSearch={googleSearch}
            googleSearchFailed={googleSearchFailed}
            googleAds={googleAds}
            googleAdsFailed={googleAdsFailed}
            log={log}
            behavior={behavior}
            behaviorFailed={behaviorFailed}
            outcomes={outcomes}
            rangeLabel={rangeLabel}
          />
        </div>
      )}

      {loading && data && (
        <p
          role="status"
          className="fixed bottom-20 lg:bottom-6 inset-x-0 mx-auto w-max z-40 bg-stone-800 text-white text-[12px] px-3 py-1.5 rounded-full shadow"
        >
          מעדכן...
        </p>
      )}
    </div>
  );
}

/**
 * One part of the page: the target of the part menu, and what its spy
 * measures. The scroll margin is the Section's, so a jump lands on the first
 * heading and not under the sticky bar.
 */
function Part({ id, children }: { id: PartId; children: ReactNode }) {
  return (
    <div id={`part-${id}`} className="scroll-mt-44 lg:scroll-mt-24 space-y-8 md:space-y-12">
      {children}
    </div>
  );
}

function Dashboard({
  data,
  articles,
  organic,
  googleSearch,
  googleSearchFailed,
  googleAds,
  googleAdsFailed,
  log,
  behavior,
  behaviorFailed,
  outcomes,
  rangeLabel,
}: {
  data: Payload;
  articles: ArticleEngagement | null;
  organic: OrganicSearch | null;
  googleSearch: GoogleSearch | null;
  googleSearchFailed: boolean;
  googleAds: GoogleAds | null;
  googleAdsFailed: boolean;
  log: EnquiryRow[] | null;
  behavior: SiteBehavior | null;
  behaviorFailed: boolean;
  outcomes: LeadOutcomes | null;
  rangeLabel: string;
}) {
  const isHourly = data.granularity === 'hour';

  if ((data.totals.events ?? 0) === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5">
        <p className="font-semibold text-stone-800 text-sm md:text-base">עדיין אין נתונים בטווח הזה</p>
        <p className="text-xs md:text-sm text-stone-600 mt-1 leading-relaxed">
          כל ביקור מכאן והלאה נספר. אפשר לבחור טווח ארוך יותר למעלה.
        </p>
      </div>
    );
  }

  // A comparison is shown only when the previous window of the same length was
  // measured in full. Before that, a month was compared against the eight days
  // that existed before it and read "+701%".
  // eslint-disable-next-line react-hooks/purity -- a render-time clock is the point: it is what "now" means for the window.
  const prevStart = Date.now() - 2 * data.range_days * 86_400_000;
  const prevComplete =
    Boolean(data.first_event) && Date.parse(`${data.first_event}T00:00:00+03:00`) <= prevStart;
  const previous = prevComplete ? data.previous : { views: 0, visits: 0, conversions: 0, signups: 0 };
  // The same rule for the AI figures, against when bot_hits started.
  const aiPrevComplete =
    Boolean(behavior?.ai_first_hit) && Date.parse(`${behavior?.ai_first_hit}T00:00:00+03:00`) <= prevStart;

  const insights = buildInsights(
    {
      totals: data.totals,
      previous,
      range_days: data.range_days,
      traffic: data.traffic,
      service_funnel: data.service_funnel,
      by_hour: data.by_hour,
      devices: data.devices,
      engagement: data.engagement,
      landing_pages: data.landing_pages,
      engagement_by_source: data.engagement_by_source,
      returning: data.returning,
    },
    serviceName,
    // The rate is the KPI right above the list; the sentence would repeat it.
    { skipHeadline: true, limit: 4 },
  );

  const timeline = isHourly ? fillHours(data.daily || [], 24) : fillDays(data.daily || [], data.range_days);
  const buckets = isHourly ? bucketKeys(24, 'hour') : bucketKeys(data.range_days, 'day');

  // Source mix over time. Only groups that sent someone get a series, and the
  // colours are pinned per group so one appearing never repaints the others.
  const trafficDaily = data.traffic_daily || [];
  const sourceSeries = Object.keys(SOURCE_SERIES)
    .map((key) => ({
      key,
      label: GROUP_LABELS[key] || key,
      color: SOURCE_SERIES[key],
      total: trafficDaily.reduce((a, r) => a + (r.grp === key ? r.visits : 0), 0),
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
  const sourcePoints = fillSeries(trafficDaily, buckets);

  const articleTitles = new Map((data.top_articles || []).map((a) => [a.slug, a.title]));

  // Bots: kept out of every figure, and named in the footer instead.
  const bots = data.bots ?? [];
  const botSessions = bots.reduce((a, b) => a + b.sessions, 0);
  const botSummary = bots
    .slice()
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 3)
    .map((b) => `${BOT_KIND_LABELS[b.kind as StoredBotKind] ?? b.kind} ${b.sessions}`)
    .join(', ');

  return (
    <>
      <Part id="summary">
        <Section id="overview" title="תמונת מצב" question={`איך הולך? ${rangeLabel}.`}>
          <Overview
            totals={data.totals}
            previous={data.previous}
            prevComplete={prevComplete}
            firstEvent={data.first_event}
            insights={insights}
            timeline={timeline}
            rangeLabel={rangeLabel}
            outcomes={outcomes}
          />
          {/* Right under the visits-and-taps chart it breaks down (Dan, 2026-10-29). */}
          {sourceSeries.length > 1 && (
            <Card title="תמהיל המקורות לאורך זמן" sub={rangeLabel}>
              <SourceBars data={sourcePoints} series={sourceSeries} />
            </Card>
          )}
        </Section>

        {/* Folded until opened (Dan, 2026-10-29); the weeks load only then. */}
        <FoldedSection id="trends" title="מגמות לאורך זמן" question="האם זה משתפר משבוע לשבוע. תמיד לפי שבועות, בלי קשר לטווח שנבחר למעלה.">
          <Trends />
        </FoldedSection>

        <Section id="enquiries" title="לחיצות ליצירת קשר" question="מה הביא את הלחיצות על ווטסאפ, טלפון, מייל וטופס.">
          <Enquiries byButton={data.conversions_by_source || []} log={log} articleTitles={articleTitles} />
        </Section>
      </Part>

      <Part id="sources">
        <Section id="sources" title="מקורות תנועה" question="איזו תנועה שווה: כמה מביא כל מקור, כמה מזה פונה, וכמה קוראים.">
          <Card>
            <SourcesTable
              rows={data.engagement_by_source || []}
              details={data.traffic || []}
              landings={behavior?.source_landings || []}
              articleTitles={articleTitles}
              siteVisits={data.totals.visits}
              siteConversions={data.totals.conversions}
            />
          </Card>

          {organic && (
            <Disclosure title="חיפוש אורגני - פירוט" sub="לאיזה עמוד גוגל שלח, והאם העמוד החזיק">
              <OrganicSearchCard
                data={organic}
                google={googleSearch}
                googleFailed={googleSearchFailed}
                articleTitles={articleTitles}
              />
            </Disclosure>
          )}

          <GeoSection />
        </Section>

        <Section id="google" title="גוגל" question="כמה עולה פנייה מהפרסום, על מה משלמים לשווא, ואיפה האורגני חסר.">
          <GoogleSection data={googleAds} failed={googleAdsFailed} />
        </Section>
      </Part>

      <Part id="content">
        <Section id="pages" title="עמודים" question="אילו עמודים הופכים ביקור לפנייה, וכמה עמוק הולך ביקור.">
          <PagesTable data={data} articleTitles={articleTitles} outcomes={outcomes} />
          {!behaviorFailed && <VisitDepth data={behavior} />}
        </Section>

        <Section id="articles" title="מאמרים" question="האם קוראים את המאמרים עד הסוף, ומה קורה אחרי.">
          <Card>
            {articles ? (
              <ArticleEngagementCard data={articles} buckets={buckets} />
            ) : (
              <Empty>טוען...</Empty>
            )}
          </Card>
        </Section>

        <Section id="ai" title="כלי AI" question="האם כלים כמו ChatGPT קוראים את האתר, ועונים ממנו.">
          {behaviorFailed ? (
            <Card>
              <Empty>לא הצלחתי לטעון את הנתונים של כלי AI.</Empty>
            </Card>
          ) : (
            <AiSection data={behavior} buckets={buckets} prevComplete={aiPrevComplete} articleTitles={articleTitles} />
          )}
        </Section>
      </Part>

      <Part id="audience">
        <Section id="audience" title="קהל" question="מאיזה מכשיר, האם חוזרים, ומתי.">
          <AudienceSection data={data} isHourly={isHourly} />
        </Section>
      </Part>

      <details className="text-[11px] text-stone-500 leading-relaxed">
        <summary className="cursor-pointer select-none min-h-[44px] inline-flex items-center font-medium">
          על הנתונים
        </summary>
        <div className="space-y-1.5 pb-2">
          <p>
            הנתונים נאספים ישירות באתר, ולכן כוללים גם מבקרים שחוסמים את גוגל אנליטיקס ואת הפיקסל של מטא. לא נשמרות
            כתובות IP ולא פרטים מזהים. כל השעות הן שעון ישראל.
          </p>
          <p>
            ביקור הוא רצף צפיות של אותו דפדפן. בגרפים ובטבלאות, פנייה היא לחיצה על ווטסאפ, טלפון או מייל, או שליחת
            טופס. ב&quot;מה יצא מזה&quot; פנייה היא הודעה או שיחה שהגיעה ונרשמה ברשימת הפניות.
          </p>
          {botSessions > 0 && (
            <p>
              לא נספרו {botSessions.toLocaleString('he-IL')} כניסות אוטומטיות{botSummary && <> ({botSummary})</>}.
            </p>
          )}
          {data.first_event && <p>המדידה פועלת מ-{heDate(data.first_event)}.</p>}
        </div>
      </details>
    </>
  );
}
