'use client';

import { useEffect, useState } from 'react';
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
import ArticleEngagementCard, { type ArticleEngagement } from '@/components/manage/ArticleEngagement';
import { buildInsights } from '@/lib/analyticsInsights';
import { BOT_KIND_LABELS, type StoredBotKind } from '@/lib/botDetect';
import { Card, Disclosure, Empty, Section, Segmented } from '@/components/manage/analytics/ui';
import { serviceName } from '@/components/manage/analytics/labels';
import { Overview, heDate } from '@/components/manage/analytics/Overview';
import { Enquiries } from '@/components/manage/analytics/Enquiries';
import { SourcesTable } from '@/components/manage/analytics/SourcesTable';
import { PagesTable } from '@/components/manage/analytics/PagesTable';
import { AudienceSection } from '@/components/manage/analytics/AudienceSection';
import { AiSection } from '@/components/manage/analytics/AiSection';
import { VisitDepth } from '@/components/manage/analytics/VisitDepth';
import type { EnquiryRow, Payload, SiteBehavior } from '@/components/manage/analytics/types';

// The admin's landing screen, read top to bottom as a chain of questions:
//
//   1. תמונת מצב  - is it working? Four figures, what they mean, their shape.
//   2. פניות      - what produced the enquiries, down to each one.
//   3. מקורות     - which traffic is worth having.
//   4. כלי AI     - whether AI tools read the site, and answer from it.
//   5. עמודים     - which pages turn a visit into an enquiry, and how deep
//                   a visit goes.
//   6. מאמרים     - whether the content is read.
//   7. קהל        - who the visitors are and when they come.
//
// It replaced about twenty flat cards in which the same data appeared up to
// three times (landing pages, source quality, enquiries per day). Every section
// here answers one question, and a figure that did not help answer one was
// cut rather than given a card of its own.
//
// Five calls, not one: the main payload, plus article engagement, organic
// search, the enquiry log and site behaviour (AI tools, visit depth), each its own RPC so that one failing leaves the
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

const SECTIONS = [
  { id: 'overview', label: 'תמונת מצב' },
  { id: 'enquiries', label: 'פניות' },
  { id: 'sources', label: 'מקורות' },
  { id: 'ai', label: 'כלי AI' },
  { id: 'pages', label: 'עמודים' },
  { id: 'articles', label: 'מאמרים' },
  { id: 'audience', label: 'קהל' },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

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

/** The section whose heading was last scrolled past, for the chip row. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const onScroll = () => {
      // 190px: the admin header plus this page's sticky bar, plus a little.
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 190) current = id;
      }
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ids]);
  return active;
}

export default function AnalyticsPage() {
  // 24 hours is the default because this is the landing screen of the admin
  // (app/manage/page.tsx redirects here): the first question on opening it is
  // "what happened since I last looked".
  const [range, setRange] = useState(1);
  const main = useRangeFetch<Payload>('/api/manage/analytics', range);
  const articlesRes = useRangeFetch<ArticleEngagement>('/api/manage/article-engagement', range);
  const organicRes = useRangeFetch<OrganicSearch>('/api/manage/organic-search', range);
  const logRes = useRangeFetch<EnquiryRow[]>('/api/manage/enquiry-log', range);
  const behaviorRes = useRangeFetch<SiteBehavior>('/api/manage/site-behavior', range);
  const active = useActiveSection(SECTION_IDS);

  const loading = !main || main.range !== range;
  const failed = !loading && Boolean(main?.failed);
  const data = main?.data ?? null;
  // The optional payloads are shown only when they were built for the range
  // the main payload is showing, so the page never mixes two ranges. A failed
  // log reads as an empty one rather than as loading forever.
  const shownRange = main?.range;
  const articles = articlesRes?.range === shownRange ? articlesRes?.data ?? null : null;
  const organic = organicRes?.range === shownRange ? organicRes?.data ?? null : null;
  const log =
    logRes?.range === shownRange ? (logRes?.data ?? (logRes?.failed ? [] : null)) : null;
  const behavior = behaviorRes?.range === shownRange ? behaviorRes?.data ?? null : null;
  const behaviorFailed = behaviorRes?.range === shownRange && Boolean(behaviorRes?.failed);

  const isHourly = data?.granularity === 'hour';
  const rangeLabel = isHourly ? '24 השעות האחרונות' : `${data?.range_days ?? range} הימים האחרונים`;

  return (
    <div className="space-y-6 md:space-y-10">
      <div>
        <h1 className="text-lg md:text-2xl font-bold text-stone-800">נתוני האתר</h1>
        <p className="text-[12px] md:text-sm text-stone-500 mt-0.5">
          נמדד ישירות באתר, בלי גוגל אנליטיקס. אנשים בלבד, בלי בוטים.
        </p>
      </div>

      {/* The range and the section chips stay under the admin header while
          scrolling: the range is the one control on the page, and most of this
          page is a long way from the top on a phone. */}
      <div className="sticky top-14 md:top-16 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-2 bg-stone-100/95 backdrop-blur-sm border-b border-stone-200/80 !mt-3">
        <div className="md:flex md:items-center md:gap-4">
          <div className="md:w-[380px] md:flex-shrink-0">
            <Segmented label="טווח זמן" options={RANGES} value={range} onChange={setRange} />
          </div>
          <nav
            aria-label="קפיצה לחלק בעמוד"
            className="mt-2 md:mt-0 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto [scrollbar-width:none]"
          >
            <ul className="flex gap-1.5 w-max">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={active === s.id ? 'true' : undefined}
                    className={`inline-flex items-center min-h-[32px] px-3 rounded-full text-[12px] md:text-[13px] font-medium whitespace-nowrap transition-colors ${
                      active === s.id
                        ? 'bg-stone-800 text-white'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
            log={log}
            behavior={behavior}
            behaviorFailed={behaviorFailed}
            rangeLabel={rangeLabel}
          />
        </div>
      )}

      {loading && data && (
        <p
          role="status"
          className="fixed bottom-20 md:bottom-6 inset-x-0 mx-auto w-max z-40 bg-stone-800 text-white text-[12px] px-3 py-1.5 rounded-full shadow"
        >
          מעדכן...
        </p>
      )}
    </div>
  );
}

function Dashboard({
  data,
  articles,
  organic,
  log,
  behavior,
  behaviorFailed,
  rangeLabel,
}: {
  data: Payload;
  articles: ArticleEngagement | null;
  organic: OrganicSearch | null;
  log: EnquiryRow[] | null;
  behavior: SiteBehavior | null;
  behaviorFailed: boolean;
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
      <Section id="overview" title="תמונת מצב" question={`איך הולך? ${rangeLabel}.`}>
        <Overview
          totals={data.totals}
          previous={data.previous}
          prevComplete={prevComplete}
          firstEvent={data.first_event}
          insights={insights}
          timeline={timeline}
          rangeLabel={rangeLabel}
        />
      </Section>

      <Section id="enquiries" title="פניות" question="מה הביא את הפניות, ומי פנה.">
        <Enquiries byButton={data.conversions_by_source || []} log={log} articleTitles={articleTitles} />
      </Section>

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

        {sourceSeries.length > 1 && (
          <Card title="תמהיל המקורות לאורך זמן" sub={rangeLabel}>
            <SourceBars data={sourcePoints} series={sourceSeries} />
          </Card>
        )}

        {organic && (
          <Disclosure title="חיפוש אורגני - פירוט" sub="לאיזה עמוד גוגל שלח, והאם העמוד החזיק">
            <OrganicSearchCard data={organic} />
          </Disclosure>
        )}
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

      <Section id="pages" title="עמודים" question="אילו עמודים הופכים ביקור לפנייה, וכמה עמוק הולך ביקור.">
        <PagesTable data={data} articleTitles={articleTitles} />
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

      <Section id="audience" title="קהל" question="מאיזה מכשיר, האם חוזרים, ומתי.">
        <AudienceSection data={data} isHourly={isHourly} />
      </Section>

      <details className="text-[11px] text-stone-500 leading-relaxed">
        <summary className="cursor-pointer select-none min-h-[44px] inline-flex items-center font-medium">
          על הנתונים
        </summary>
        <div className="space-y-1.5 pb-2">
          <p>
            הנתונים נאספים ישירות באתר, ולכן כוללים גם מבקרים שחוסמים את גוגל אנליטיקס ואת הפיקסל של מטא. לא נשמרות
            כתובות IP ולא פרטים מזהים. כל השעות הן שעון ישראל.
          </p>
          <p>ביקור הוא רצף צפיות של אותו דפדפן. פנייה היא לחיצה על ווטסאפ, טלפון או מייל, או שליחת טופס.</p>
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
