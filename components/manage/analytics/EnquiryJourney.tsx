'use client';

import { useEffect, useState } from 'react';
import { ACTION_COLOR } from '@/components/manage/Charts';
import { duration } from './ui';
import { journeyLabel, pageName } from './labels';
import type { EnquiryJourney } from './types';

// The whole story of one enquiry, opened from its row in "הפניות עצמן": the
// visit it came from, event by event with the time spent on each page, what
// happened after it, and the earlier visits that were probably the same person.
//
// "Probably" is the honest word. There is no visitor id, by design - a visit
// is a random id that dies with the tab - so an earlier visit is matched by
// device, visit number, date and the same keyword or referrer. The panel says so.

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: EnquiryJourney };

/** Loads the journey on mount, so only rows that are opened cost a call. */
export function EnquiryJourneyLoader({
  session,
  articleTitles,
}: {
  session: string;
  articleTitles?: Map<string, string>;
}) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    fetch(`/api/manage/enquiry-journey?session=${encodeURIComponent(session)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: EnquiryJourney) => live && setState({ status: 'ready', data }))
      .catch(() => live && setState({ status: 'error' }));
    return () => {
      live = false;
    };
  }, [session]);

  if (state.status === 'loading') return <p className="text-[12px] text-stone-400 py-2">טוען...</p>;
  if (state.status === 'error')
    return <p className="text-[12px] text-stone-500 py-2">לא הצלחתי לטעון את פרטי הביקור.</p>;
  return <JourneyPanel journey={state.data} articleTitles={articleTitles} />;
}

const secsBetween = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 1000));
const hm = (ts: string) => ts.slice(11, 16);
const dm = (ts: string) => {
  const [, m, d] = ts.slice(0, 10).split('-').map(Number);
  return `${d}.${m}`;
};

/** Consecutive repeats of a page folded into one "×3". */
function foldPages(paths: string[]): Array<{ path: string; n: number }> {
  const out: Array<{ path: string; n: number }> = [];
  for (const p of paths) {
    const last = out[out.length - 1];
    if (last && last.path === p) last.n += 1;
    else out.push({ path: p, n: 1 });
  }
  return out;
}

export function JourneyPanel({
  journey,
  articleTitles: known,
}: {
  journey: EnquiryJourney;
  articleTitles?: Map<string, string>;
}) {
  const articleTitles = new Map([...Object.entries(journey.titles || {}), ...(known || new Map())]);
  const events = journey.events || [];
  const earlier = journey.earlier || [];

  if (events.length === 0) {
    return <p className="text-[12px] text-stone-500 py-2">אין פירוט אירועים לביקור הזה.</p>;
  }

  const firstEnquiry = events.findIndex((e) => e.is_conversion);

  // Time on a page: from its view to the next page view. The last page of the
  // visit has no end we can see.
  const stay = events.map((e, i) => {
    if (e.event_name !== 'page_view') return null;
    const next = events.slice(i + 1).find((x) => x.event_name === 'page_view');
    return next ? secsBetween(e.ts, next.ts) : null;
  });

  // The page an action happened on is the line above it; name it only when not.
  const pageBefore: Array<string | null> = [];
  let current: string | null = null;
  for (const e of events) {
    pageBefore.push(current);
    if (e.event_name === 'page_view') current = e.path;
  }

  // The two insights, each only when the data says it.
  const sameAd = !!journey.paid && !!journey.utm_term && earlier.some((v) => v.paid && v.utm_term === journey.utm_term);

  const views = new Map<string, number>();
  for (const e of events) if (e.event_name === 'page_view' && e.path) views.set(e.path, (views.get(e.path) || 0) + 1);
  for (const v of earlier) for (const p of v.pages) views.set(p, (views.get(p) || 0) + 1);
  const [topPath, topViews] = [...views.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];

  const start = events[0].ts;
  const end = events[events.length - 1].ts;

  return (
    <div className="space-y-4 pt-1 pb-2 text-[12px] md:text-[13px] leading-relaxed">
      <section>
        <h4 className="text-[12px] font-semibold text-stone-700 mb-1.5">
          הביקור שבו פנו
          <span className="font-normal text-stone-400 tabular-nums">
            {' '}
            · {hm(start)}-{hm(end)} · {duration(secsBetween(start, end))}
          </span>
        </h4>
        <ol className="border-s-2 border-stone-200 ms-1">
          {events.map((e, i) => {
            const isEnquiry = e.is_conversion;
            const after = firstEnquiry >= 0 && i === firstEnquiry + 1;
            return (
              <li key={`${e.ts}-${i}`}>
                {after && (
                  <p className="-ms-[2px] ps-3 pt-2 pb-1 text-[11px] font-semibold text-stone-500 border-s-2 border-stone-200">
                    אחרי הפנייה
                  </p>
                )}
                <div
                  className={`relative flex gap-2.5 ps-3 py-1 ${isEnquiry ? 'rounded-e-md' : ''}`}
                  style={isEnquiry ? { background: `${ACTION_COLOR}1f` } : undefined}
                >
                  <span
                    className="absolute top-[11px] -start-[5px] w-2 h-2 rounded-full ring-2 ring-white"
                    style={{ background: isEnquiry ? ACTION_COLOR : '#a8a29e' }}
                    aria-hidden="true"
                  />
                  <span className="flex-shrink-0 w-[52px] text-[11px] text-stone-400 tabular-nums pt-px">
                    {e.ts.slice(11, 19)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={isEnquiry ? 'font-semibold text-stone-900' : 'text-stone-700'}>
                      {journeyLabel(e, articleTitles)}
                    </span>
                    {e.event_name !== 'page_view' && e.path && e.path !== pageBefore[i] && (
                      <span className="text-stone-400"> · בעמוד {pageName(e.path, articleTitles)}</span>
                    )}
                    {stay[i] !== null && (
                      <span className="text-stone-400 tabular-nums"> · {duration(stay[i] as number)}</span>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {earlier.map((v) => (
        <section key={`${v.visit_number}-${v.started}`}>
          <h4 className="text-[12px] font-semibold text-stone-700 mb-1">
            ביקור קודם (כנראה אותו מבקר)
            <span className="font-normal text-stone-400 tabular-nums">
              {' '}
              · {dm(v.started)} · {hm(v.started)}-{hm(v.ended)}
            </span>
          </h4>
          <p className="text-stone-700">
            {foldPages(v.pages).map((p, i) => (
              <span key={`${p.path}-${i}`}>
                {i > 0 && <span className="text-stone-300"> › </span>}
                {pageName(p.path, articleTitles)}
                {p.n > 1 && <span className="text-stone-400 tabular-nums"> ×{p.n}</span>}
              </span>
            ))}
          </p>
          <p className="text-stone-500">
            {v.paid ? 'מודעה בגוגל' : v.referrer_host || 'כניסה ישירה'}
            {v.utm_term && <> · &quot;{v.utm_term}&quot;</>}
          </p>
        </section>
      ))}

      {(sameAd || topViews >= 3) && (
        <ul className="space-y-1 rounded-lg bg-stone-50 px-3 py-2 text-stone-700">
          {sameAd && <li>הביקור הקודם הגיע מאותה מודעה - כנראה שתי לחיצות בתשלום.</li>}
          {topViews >= 3 && (
            <li>
              העמוד שחזרו אליו הכי הרבה: <strong className="font-semibold">{pageName(topPath, articleTitles)}</strong>{' '}
              <span className="text-stone-500 tabular-nums">
                ({topViews} צפיות{earlier.length > 0 ? ' בכל הביקורים' : ''})
              </span>
            </li>
          )}
        </ul>
      )}

      {earlier.length > 0 && (
        <p className="text-[11px] text-stone-400">
          &quot;כנראה&quot; - האתר לא מזהה מבקרים. הביקור הקודם הותאם לפי אותו מכשיר, מספר הביקור ואותה מילת חיפוש או
          אותו מקור.
        </p>
      )}
    </div>
  );
}
