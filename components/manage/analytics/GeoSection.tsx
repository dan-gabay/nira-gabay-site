'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { AiFetchBars, AI_ANSWER_COLOR, AI_SERIES } from '@/components/manage/Charts';
import { BarList, CardPart, Empty, Explain, Note, Segmented, Stat, StatGrid, SubHead, type BarRow } from '@/components/manage/analytics/ui';
import { heDate } from '@/components/manage/analytics/Overview';
import { pageName } from '@/components/manage/analytics/labels';
import type { CrawlReport, GeoKind, InvalidRow } from '@/lib/geo/crawl';
import type { Cell, VisibilityReport } from '@/lib/geo/visibility';
import type { SiteCheck } from '@/lib/geo/siteChecks';

// GEO: is the site readable by AI tools, do they read it, and does Nira come
// up when someone asks one for a therapist. A folded section under מקורות on
// /manage/analytics (Dan, 24 Oct: not a page of its own), loaded from
// /api/manage/geo only when it is first opened - the route reads every
// bot_hits row in the range and fetches the live site, which the rest of the
// analytics page should not wait for.
//
//   סריקות          - requests from AI crawlers and search engines (bot_hits).
//                     A request is not a reader, an impression or a
//                     recommendation; the section never calls it one.
//   פתיחות בתשובה   - an assistant fetching a page mid-conversation. The only
//                     server-side sign that a person was on the other end.
//   הפניות          - visits that arrived from an AI tool (site_events).
//   נראות בתשובות   - observed answers to fixed prompts, from the repo file
//                     lib/geo/visibility-observations.json. Never measured is
//                     shown as never measured.

type GeoPayload = {
  generatedAt: string;
  rangeDays: number;
  rowsRead: number;
  truncated: boolean;
  crawl: CrawlReport;
  unread: string[];
  titles: Record<string, string>;
  referrals: {
    error: string | null;
    daily: Array<{ day: string; visits: number; conversions: number }>;
    tools: Array<{ tool: string | null; visits: number; conversions: number }>;
    siteVisits: number | null;
    measuredFrom: string | null;
  };
  visibility: VisibilityReport;
  checks: SiteCheck[];
};

const RANGES = [
  { value: 7, label: '7 ימים' },
  { value: 30, label: '30 יום' },
  { value: 56, label: '8 שבועות' },
  { value: 90, label: '90 יום' },
];

const KIND_LABEL: Record<GeoKind, string> = {
  ai_crawler: 'סריקת AI',
  ai_answer: 'פתיחה בתשובה',
  search: 'מנוע חיפוש',
};

const REASON_LABEL: Record<InvalidRow['reason'], string> = {
  null_segment: 'ערך חסר שהפך לקישור (null)',
  probe: 'ניסיון גישה לקבצי מערכת',
  old_url: 'כתובת מהאתר הקודם',
  unknown: 'כתובת שלא קיימת',
};

/** '2026-10-24T13:05:00Z' as '24.10 16:05' Israel time. */
const heWhen = (iso: string | null) => {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
};

const daysAgo = (iso: string | null) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 86_400_000) : null);

/** One question of the section, under its own heading. */
function Block({ title, question, children }: { title: string; question: string; children: ReactNode }) {
  return (
    <section className="pt-5 mt-5 border-t border-stone-200 first:mt-0 first:pt-0 first:border-t-0 min-w-0">
      <h3 className="text-[13px] md:text-sm font-semibold text-stone-800">{title}</h3>
      <p className="text-[11px] md:text-xs text-stone-400 mt-0.5 mb-3">{question}</p>
      {children}
    </section>
  );
}

export default function GeoSection() {
  const ref = useRef<HTMLDetailsElement>(null);
  const [opened, setOpened] = useState(false);
  const [range, setRange] = useState(56);
  const [state, setState] = useState<{ range: number; data: GeoPayload | null; error: boolean } | null>(null);

  // The link from the AI section lands on #geo: open it there.
  useEffect(() => {
    if (window.location.hash === '#geo' && ref.current) {
      ref.current.open = true;
      ref.current.scrollIntoView();
    }
  }, []);

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    fetch(`/api/manage/geo?range=${range}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as GeoPayload;
      })
      .then((data) => !cancelled && setState({ range, data, error: false }))
      .catch(() => !cancelled && setState({ range, data: null, error: true }));
    return () => {
      cancelled = true;
    };
  }, [opened, range]);

  const loading = state?.range !== range;
  const data = state?.data ?? null;

  return (
    <details
      ref={ref}
      id="geo"
      onToggle={(e) => e.currentTarget.open && setOpened(true)}
      className="group bg-white rounded-2xl border border-stone-200 min-w-0 scroll-mt-24"
    >
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between gap-3 p-4 md:p-5 min-h-[44px]">
        <span className="min-w-0">
          <span className="block text-[13px] md:text-sm font-semibold text-stone-800">נראות במנועי AI</span>
          <span className="block text-[11px] text-stone-400 mt-0.5">
            סריקות, עמודים שנקראו, המלצות, אזכור בתשובות ובריאות טכנית
          </span>
        </span>
        <ChevronDown className="w-5 h-5 flex-shrink-0 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-4 pb-4 md:px-5 md:pb-5 border-t border-stone-100 pt-4">
        <div className="mb-5 max-w-md">
          <Segmented options={RANGES} value={range} onChange={setRange} label="טווח" />
        </div>
        {state?.error && !loading && <Empty>לא הצלחתי לטעון את הנתונים. נסו לרענן.</Empty>}
        {!data && !state?.error && <Empty>טוען...</Empty>}
        {data && (
          <div className={`transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <Summary data={data} />
            <CrawlSection data={data} />
            <PagesSection data={data} />
            <ReferralsSection data={data} />
            <VisibilitySection report={data.visibility} />
            <HealthSection data={data} />
            <p className="mt-5 text-[11px] text-stone-400">
              עודכן {heWhen(data.generatedAt)} · {data.rowsRead.toLocaleString('he-IL')} רשומות סריקה נקראו
              {data.truncated && ' (הטווח נחתך - יותר מדי רשומות)'}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

// ─────────────────────────────────────────── summary

function Summary({ data }: { data: GeoPayload }) {
  const t = data.crawl.totals;
  const v = data.visibility;
  const aiVisits = data.referrals.daily.reduce((a, d) => a + d.visits, 0);
  const failing = data.checks.filter((c) => !c.ok && c.severity === 'fail').length;
  return (
    <Block title="תמונת מצב" question={`${data.rangeDays} הימים האחרונים, ומצב הנראות בבדיקה האחרונה.`}>
      <>
        <StatGrid>
          <Stat label="סריקות של כלי AI" value={t.ai_crawler} sub={`נסרק לאחרונה ${heWhen(data.crawl.lastSeen.ai_crawler)}`} color={AI_SERIES[0].color} />
          <Stat
            label="נפתח תוך כדי תשובה"
            value={t.ai_answer}
            sub={data.crawl.lastSeen.ai_answer ? `לאחרונה ${heWhen(data.crawl.lastSeen.ai_answer)}` : 'לא נרשם בטווח'}
            color={AI_ANSWER_COLOR}
          />
          <Stat label="ביקורים מהמלצת AI" value={aiVisits} sub={data.referrals.error ? 'לא נטען' : 'אנשים שלחצו על קישור בתשובה'} />
          <Stat
            label="מוזכרת בתשובות AI"
            value={v.measuredPrompts ? `${v.mentionedPrompts} מתוך ${v.measuredPrompts}` : 'לא נמדד'}
            sub={v.lastObserved ? `בדיקה אחרונה ${heDate(v.lastObserved)}` : 'אין עדיין תצפיות'}
          />
        </StatGrid>
        {failing > 0 && (
          <Note>
            <span className="text-red-700 font-medium">{failing} בדיקות טכניות נכשלו</span> - פירוט בסוף הסקשן.
          </Note>
        )}
        <Explain>
          סריקה היא בקשה אוטומטית לעמוד. היא אינה קורא, אינה חשיפה ואינה המלצה, ואותו כלי יכול לסרוק עמוד עשרות פעמים.
          פתיחה תוך כדי תשובה היא הסימן היחיד בצד השרת שמישהו שאל כלי AI משהו והוא פתח את האתר כדי לענות. ביקור מהמלצת AI
          הוא אדם שלחץ על קישור בתשובה; כלים שלא שולחים מקור הפניה נספרים כישירים, כך שזה מינימום. האזכור בתשובות מבוסס רק
          על תצפיות אמיתיות, ולכל כלי שלא נבדק כתוב שלא נמדד.
        </Explain>
      </>
    </Block>
  );
}

// ─────────────────────────────────────────── crawl activity

function CrawlSection({ data }: { data: GeoPayload }) {
  const c = data.crawl;
  const daily = c.daily.map((d) => ({ day: d.day, crawler: d.ai_crawler, answer: d.ai_answer, search: d.search }));
  return (
    <Block title="סריקות לאורך זמן" question="כמה פעמים כלי AI ומנועי חיפוש קראו את האתר, ומתי היה חריג.">
      <>
        <AiFetchBars data={daily} granularity="day" />
        <CardPart>
          <SubHead title="שבוע אחרי שבוע" aside="ראשון עד שבת" />
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[12px] md:text-[13px] tabular-nums">
              <thead>
                <tr className="text-stone-400 text-start">
                  <th className="font-normal text-start px-1 py-1">שבוע</th>
                  <th className="font-normal text-end px-1 whitespace-nowrap">סריקות AI</th>
                  <th className="font-normal text-end px-1 whitespace-nowrap">בתשובה</th>
                  <th className="font-normal text-end px-1 whitespace-nowrap">חיפוש</th>
                </tr>
              </thead>
              <tbody>
                {[...c.weekly].reverse().map((w) => (
                  <tr key={w.week} className="border-t border-stone-100 text-stone-700">
                    <td className="px-1 py-1.5 whitespace-nowrap">
                      {heDate(w.week)}
                      {(w.current || w.days < 7) && <span className="text-stone-400"> ({w.days} ימים)</span>}
                    </td>
                    <td className="text-end px-1">{w.ai_crawler.toLocaleString('he-IL')}</td>
                    <td className="text-end px-1">{w.ai_answer}</td>
                    <td className="text-end px-1">{w.search.toLocaleString('he-IL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardPart>
        <CardPart>
          <SubHead title="ימים חריגים" aside="פי 3 לפחות מהחציון של 14 הימים שלפני" />
          {c.spikes.length === 0 ? (
            <Empty>אין ימים חריגים בטווח.</Empty>
          ) : (
            <ul className="space-y-1 text-[12px] md:text-[13px] text-stone-700">
              {c.spikes.map((s) => (
                <li key={`${s.day}-${s.kind}`}>
                  {heDate(s.day)} · {KIND_LABEL[s.kind]}: {s.count.toLocaleString('he-IL')}{' '}
                  <span className="text-stone-400">(בדרך כלל {Math.round(s.baseline)})</span>
                </li>
              ))}
            </ul>
          )}
        </CardPart>
        <CardPart>
          <SubHead title="לפי כלי" />
          {c.agentRows === 0 ? (
            <Empty>
              עדיין אין נתונים. שם הכלי (למשל GPTBot מול OAI-SearchBot) נשמר מ-25.10.2026, ובטווח הזה עוד לא נרשמה סריקה עם שם.
            </Empty>
          ) : (
            <BarList
              rows={c.agents.map((a) => ({
                key: `${a.agent}-${a.kind}`,
                label: a.agent,
                sub: KIND_LABEL[a.kind as GeoKind] ?? a.kind,
                value: a.hits,
                meta: `לאחרונה ${heWhen(a.last)}`,
              }))}
              color={AI_SERIES[0].color}
            />
          )}
        </CardPart>
      </>
    </Block>
  );
}

// ─────────────────────────────────────────── pages

function PagesSection({ data }: { data: GeoPayload }) {
  const [all, setAll] = useState(false);
  const titles = new Map(Object.entries(data.titles));
  const name = (p: string) => pageName(p, titles);
  const answered: BarRow[] = data.crawl.pages
    .filter((p) => p.counts.ai_answer > 0)
    .map((p) => ({ key: p.path, label: name(p.path), value: p.counts.ai_answer, meta: `לאחרונה ${heWhen(p.last.ai_answer)}` }));
  const rows = [...data.crawl.pages].sort((a, b) => b.counts.ai_crawler - a.counts.ai_crawler);
  const shown = all ? rows : rows.slice(0, 12);
  return (
    <Block title="אילו עמודים נקראים" question="מה נסרק הכי הרבה, ומתי כל עמוד נקרא לאחרונה.">
      <>
        <SubHead title="נפתחו תוך כדי תשובה" aside="פתיחות" />
        <BarList rows={answered} color={AI_ANSWER_COLOR} empty="אף עמוד לא נפתח תוך כדי תשובה בטווח הזה." />
        <CardPart>
          <SubHead title="הכי נסרקים" aside="סריקה אחרונה" />
          <ul className="divide-y divide-stone-100 text-[12px] md:text-[13px]">
            {shown.map((p) => (
              <li key={p.path} className="py-2 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-stone-800 truncate min-w-0" title={p.path}>
                    {name(p.path)}
                    {p.status !== 'listed' && <span className="text-stone-400"> · לא במפת האתר</span>}
                  </span>
                  <span className="text-stone-700 tabular-nums whitespace-nowrap flex-shrink-0">
                    AI {p.counts.ai_crawler.toLocaleString('he-IL')} · חיפוש {p.counts.search.toLocaleString('he-IL')}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 tabular-nums mt-0.5">
                  AI לאחרונה {heWhen(p.last.ai_crawler)} · חיפוש לאחרונה {heWhen(p.last.search)}
                </div>
              </li>
            ))}
          </ul>
          {rows.length > 12 && (
            <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-[12px] text-stone-500 underline min-h-[32px]">
              {all ? 'פחות' : `הצג את כל ${rows.length} העמודים`}
            </button>
          )}
        </CardPart>
        <CardPart>
          <SubHead title="עמודים במפת האתר שלא נסרקו בטווח" aside={String(data.unread.length)} />
          {data.unread.length === 0 ? (
            <Empty>כל העמודים במפת האתר נקראו לפחות פעם אחת.</Empty>
          ) : (
            <ul className="text-[12px] md:text-[13px] text-stone-700 space-y-0.5">
              {data.unread.map((p) => (
                <li key={p}>{name(p)}</li>
              ))}
            </ul>
          )}
        </CardPart>
      </>
    </Block>
  );
}

// ─────────────────────────────────────────── referrals

function ReferralsSection({ data }: { data: GeoPayload }) {
  const r = data.referrals;
  const total = r.daily.reduce((a, d) => a + d.visits, 0);
  const conv = r.daily.reduce((a, d) => a + d.conversions, 0);
  return (
    <Block title="ביקורים מהמלצת AI" question="אנשים שהגיעו לאתר מקישור בתשובה של כלי AI.">
      <>
        {r.error ? (
          <Empty>לא הצלחתי לטעון את נתוני הביקורים.</Empty>
        ) : total === 0 ? (
          <Empty>לא נרשם ביקור מכלי AI בטווח הזה.</Empty>
        ) : (
          <>
            <StatGrid>
              <Stat label="ביקורים" value={total} />
              <Stat label="מתוכם עם לחיצה ליצירת קשר" value={conv} />
            </StatGrid>
            <CardPart>
              <SubHead title="לפי כלי" aside="ביקורים" />
              <BarList
                rows={r.tools.map((t) => ({ key: t.tool || 'unknown', label: t.tool || 'לא ידוע', value: t.visits }))}
                color={AI_ANSWER_COLOR}
              />
            </CardPart>
          </>
        )}
        <Explain>
          נספר כשהגיע מקור הפניה של כלי AI (chatgpt.com, perplexity.ai, gemini.google.com ועוד) או תגית utm_source של כלי
          כזה. Google AI Overviews נספרים כחיפוש אורגני, כי גוגל שולחת את אותו מקור הפניה. אפליקציות שלא שולחות מקור נספרות
          כישירות, ולכן זה מינימום ולא סך הכל.
        </Explain>
      </>
    </Block>
  );
}

// ─────────────────────────────────────────── prompt visibility

function cellText(c: Cell): { text: string; tone: string } {
  const o = c.latest;
  if (!o) return { text: 'לא נמדד', tone: 'text-stone-300' };
  if (!o.answer_present) return { text: 'אין תשובת AI', tone: 'text-stone-500' };
  if (o.nira_mentioned === true) return { text: o.position ? `מוזכרת (#${o.position})` : 'מוזכרת', tone: 'text-emerald-700 font-medium' };
  if (o.nira_mentioned === null) return { text: 'לא ברור', tone: 'text-amber-700' };
  return { text: 'לא מוזכרת', tone: 'text-red-700' };
}

function VisibilitySection({ report }: { report: VisibilityReport }) {
  const [open, setOpen] = useState<string | null>(null);
  const measuredProviders = report.providers.filter((p) => report.cells.some((c) => c.provider === p.id && c.latest));
  const unmeasured = report.providers.filter((p) => !measuredProviders.includes(p));
  const cellOf = (promptId: string, provider: string) => report.cells.find((c) => c.prompt_id === promptId && c.provider === provider)!;
  const opened = open ? report.cells.find((c) => `${c.prompt_id}|${c.provider}` === open) : null;

  return (
    <Block title="נראות בתשובות AI"
      question="כשמישהו שואל כלי AI על מטפלת באזור, האם נירה מוזכרת - לפי תצפיות אמיתיות בלבד."
    >
      <>
        <p className="text-[12px] md:text-[13px] text-stone-600 mb-3">
          נמדדו {report.measuredPairs} מתוך {report.totalPairs} צירופים של שאילתה וכלי.
          {report.lastObserved && <> בדיקה אחרונה: {heDate(report.lastObserved)}.</>}
        </p>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12px] md:text-[13px]">
            <thead>
              <tr className="text-stone-400">
                <th className="font-normal text-start px-1 py-1">שאילתה</th>
                {measuredProviders.map((p) => (
                  <th key={p.id} className="font-normal text-start px-1 whitespace-nowrap">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.prompts.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-1 py-1.5 text-stone-700">{p.text}</td>
                  {measuredProviders.map((prov) => {
                    const c = cellOf(p.id, prov.id);
                    const t = cellText(c);
                    const key = `${p.id}|${prov.id}`;
                    return (
                      <td key={prov.id} className="px-1 whitespace-nowrap">
                        {c.latest ? (
                          <button type="button" onClick={() => setOpen(open === key ? null : key)} className={`${t.tone} underline-offset-2 hover:underline min-h-[32px]`}>
                            {t.text}
                            <span className="text-stone-400 font-normal"> · {heDate(c.latest.observed_at)}</span>
                          </button>
                        ) : (
                          <span className={t.tone}>{t.text}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {opened?.latest && (
          <CardPart>
            <SubHead title={`מה נראה ב-${report.providers.find((p) => p.id === opened.provider)?.label}`} aside={heWhen(opened.latest.observed_at)} />
            <dl className="text-[12px] md:text-[13px] text-stone-700 space-y-1.5">
              <div>
                <dt className="inline text-stone-400">מי הוזכר: </dt>
                <dd className="inline">{opened.latest.competitors?.length ? opened.latest.competitors.join(' · ') : 'לא נרשם'}</dd>
              </div>
              <div>
                <dt className="inline text-stone-400">מקורות שצוטטו: </dt>
                <dd className="inline">{opened.latest.cited_sources.join(' · ') || '-'}</dd>
              </div>
              {opened.latest.serp && (
                <div>
                  <dt className="inline text-stone-400">בתוצאות הרגילות: </dt>
                  <dd className="inline">
                    עשר הראשונות: {opened.latest.serp.organic_top10 ? 'כן' : 'לא'} · מפה מקומית:{' '}
                    {opened.latest.serp.local_pack === null ? 'לא הוצגה' : opened.latest.serp.local_pack ? 'כן' : 'לא'}
                  </dd>
                </div>
              )}
              {opened.previous && (
                <div>
                  <dt className="inline text-stone-400">בבדיקה הקודמת ({heDate(opened.previous.observed_at)}): </dt>
                  <dd className="inline">{cellText({ ...opened, latest: opened.previous }).text}</dd>
                </div>
              )}
              {opened.latest.notes && <p className="text-stone-500">{opened.latest.notes}</p>}
              <p className="text-stone-400">
                {opened.latest.method === 'serpapi' ? 'נמדד דרך SerpApi' : opened.latest.method === 'manual' ? 'בדיקה ידנית' : 'API מאושר'} ·{' '}
                {opened.latest.observer}
                {opened.latest.location && <> · {opened.latest.location}</>}
              </p>
            </dl>
          </CardPart>
        )}

        <CardPart>
          <SubHead title="המקורות שכלי AI מצטטים" aside="בכמה שאילתות" />
          <BarList rows={report.sources.map((s) => ({ key: s.source, label: s.source, value: s.count }))} color="#78716c" empty="אין עדיין תצפיות." />
          <Note>אלה האתרים שמהם התשובות נבנות. להופיע בהם (פרופיל עדכני ומלא) הוא הדרך הישירה ביותר להיכנס לתשובות.</Note>
        </CardPart>

        <CardPart>
          <SubHead title="כלים שעוד לא נמדדו" />
          <ul className="text-[12px] md:text-[13px] text-stone-600 space-y-1">
            {unmeasured.map((p) => (
              <li key={p.id}>
                <span className="font-medium text-stone-700">{p.label}</span> - {p.access}
              </li>
            ))}
          </ul>
          {report.estimates.length > 0 && (
            <Note>{report.estimates.length} הערכות שמורות בנפרד ואינן נספרות כתוצאה.</Note>
          )}
          {report.invalid.length > 0 && (
            <Note>
              <span className="text-red-700">{report.invalid.length} תצפיות לא תקינות לא הוצגו:</span>{' '}
              {report.invalid.map((i) => `${i.id} (${i.errors.join(', ')})`).join(' · ')}
            </Note>
          )}
        </CardPart>

        <Explain>
          כל תוצאה כאן היא תשובה שמישהו באמת ראה, עם התאריך והדרך שבה נבדקה. אין כאן הערכות, ותשובה של מודל דרך API כללי
          לא נחשבת כתוצאה של ChatGPT או של חיפוש: אין בה שלב חיפוש, מיקום או מקורות. התשובות משתנות בין בדיקות ובין משתמשים,
          ולכן תצפית אחת היא סימן ולא דירוג. השאילתות נמצאות ב-lib/geo/visibility-prompts.json והתצפיות ב-visibility-observations.json.
        </Explain>
      </>
    </Block>
  );
}

// ─────────────────────────────────────────── crawl health

function HealthSection({ data }: { data: GeoPayload }) {
  const inv = data.crawl.invalid;
  const invHits = inv.reduce((a, r) => a + r.hits, 0);
  const sinceAnswer = daysAgo(data.crawl.lastSeen.ai_answer);
  return (
    <Block title="בריאות טכנית" question="מה האתר מחזיר לסורקים עכשיו, ואילו בקשות הגיעו לכתובות שלא קיימות.">
      <>
        <SubHead title="בדיקה חיה של האתר" aside={heWhen(data.generatedAt)} />
        <ul className="space-y-2">
          {data.checks.map((c) => (
            <li key={c.id} className="text-[12px] md:text-[13px]">
              <span className={c.ok ? 'text-emerald-700' : c.severity === 'fail' ? 'text-red-700' : 'text-amber-700'}>
                {c.ok ? '✓' : c.severity === 'fail' ? '✗' : '!'}
              </span>{' '}
              <span className="text-stone-800">{c.label}</span>
              <span className="block text-[11px] text-stone-400 ms-4 break-words">{c.detail}</span>
            </li>
          ))}
        </ul>
        {sinceAnswer !== null && sinceAnswer > 14 && (
          <Note>אף כלי AI לא פתח עמוד תוך כדי תשובה כבר {sinceAnswer} ימים.</Note>
        )}

        <CardPart>
          <SubHead title="בקשות לכתובות שלא קיימות" aside={`${invHits.toLocaleString('he-IL')} בקשות`} />
          {inv.length === 0 ? (
            <Empty>אין בטווח הזה.</Empty>
          ) : (
            <ul className="space-y-1.5 text-[12px] md:text-[13px]">
              {inv.slice(0, 15).map((r) => (
                <li key={r.path} className="text-stone-700">
                  <span className="font-mono text-[11px] break-all" dir="ltr">
                    {decodeSafe(r.path)}
                  </span>{' '}
                  · {r.hits.toLocaleString('he-IL')}
                  <span className="block text-[11px] text-stone-400">
                    {REASON_LABEL[r.reason]} · לאחרונה {heWhen(r.last)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Explain>
            /articles/null ודומיו הם ערך חסר שסורק פירש כקישור יחסי, ולכן הם מופיעים בכל עומק תיקייה (/null, /articles/null,
            /articles/topic/null). עמוד מאמר שלא קיים החזיר בעבר 200 במקום 404, כך שהכתובת נראתה לסורקים כעמוד אמיתי. הבדיקה
            החיה למעלה מוודאת שכתובות כאלה מחזירות היום 404 אמיתי.
          </Explain>
        </CardPart>
      </>
    </Block>
  );
}

const decodeSafe = (p: string) => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};
