'use client';

import { useState } from 'react';
import type { GoogleAds } from '@/lib/google/types';
import { Card, CardPart, Empty, Note, ShowMore, Stat, StatGrid, SubHead, wholePct } from './ui';

// The "גוגל" section: what the ads cost against what they brought, which
// keywords the site pays for because it is absent organically, and which
// search terms cost money without a result. Live from /api/manage/google/ads.
// Nothing here changes the Ads account; the exclusion list is for review.

const KEYWORDS_SHOWN = 8;
const TERMS_SHOWN = 10;

function money(n: number): string {
  const v = n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
  return `₪${v.toLocaleString('he-IL')}`;
}

const per = (cost: number, n: number) => (n > 0 ? money(cost / n) : '-');

function heDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}.${m}.${y}`;
}

function Th({ children, end }: { children: React.ReactNode; end?: boolean }) {
  return <th className={`${end ? 'text-end' : 'text-start'} font-normal pb-1.5 px-1`}>{children}</th>;
}

type Loaded = Extract<GoogleAds, { configured: true }>;

function Cost({ data }: { data: Loaded }) {
  const l = data.leads;
  return (
    <Card title="כמה עולה פנייה" sub={`${heDate(data.since)} - ${heDate(data.until)}`}>
      <StatGrid>
        <Stat label="עלות הפרסום" value={money(data.cost)} sub={`${data.clicks.toLocaleString('he-IL')} לחיצות`} />
        <Stat label="פניות מהפרסום" value={l.leads} sub={`עלות לפנייה ${per(data.cost, l.leads)}`} />
        <Stat label="הגיעו לשיחה" value={l.spoke} sub={`עלות לשיחה ${per(data.cost, l.spoke)}`} />
        <Stat label="התחילו טיפול" value={l.clients} sub={`עלות למטופל ${per(data.cost, l.clients)}`} />
      </StatGrid>
      <Note>
        עלות מגוגל אדס (דרך GA4), פניות ומצבן מרשימת הפניות. שני הצדדים מאותם ימים.
        {data.clipped && ` מילת המפתח נשמרת עם הפנייה רק מ-${heDate(data.trackedFrom)}, ולכן הטווח מתחיל שם ולא קודם.`}
        {l.open > 0 && ` ${l.open} פניות עוד בלי סטטוס, ולכן השיחות והמטופלים עשויים לגדול.`}
      </Note>
    </Card>
  );
}

function Keywords({ data }: { data: Loaded }) {
  const [showAll, setShowAll] = useState(false);
  const rows = data.keywords;
  const shown = showAll ? rows : rows.slice(0, KEYWORDS_SHOWN);
  const noLeadCost = rows.filter((k) => k.leads === 0).reduce((a, k) => a + k.cost, 0);
  const absent = rows.filter((k) => k.organicPosition === null);
  const absentCost = absent.reduce((a, k) => a + k.cost, 0);

  return (
    <Card title="מילות מפתח" sub="עלות, פניות ומיקום אורגני">
      {rows.length === 0 ? (
        <Empty>אין עלות על מילות מפתח בטווח הזה.</Empty>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[12px] md:text-[13px] tabular-nums">
              <thead className="text-stone-400 text-[11px] md:text-[12px]">
                <tr>
                  <Th>מילת מפתח</Th>
                  <Th end>עלות</Th>
                  <Th end>לחיצות</Th>
                  <Th end>פניות</Th>
                  <Th end>מטופלים</Th>
                  <Th end>אורגני</Th>
                </tr>
              </thead>
              <tbody className="text-stone-700">
                {shown.map((k) => (
                  <tr key={k.keyword} className="border-t border-stone-100">
                    <td className="py-1.5 px-1">{k.keyword}</td>
                    <td className="text-end px-1">{money(k.cost)}</td>
                    <td className="text-end px-1">{k.clicks}</td>
                    <td className={`text-end px-1 ${k.leads === 0 ? 'text-amber-700 font-semibold' : ''}`}>
                      {k.leads}
                    </td>
                    <td className="text-end px-1">{k.clients}</td>
                    <td className="text-end px-1 whitespace-nowrap">
                      {k.organicPosition === null ? (
                        <span className="text-stone-400">לא מופיע</span>
                      ) : (
                        <>מקום {k.organicPosition}</>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > KEYWORDS_SHOWN && (
            <ShowMore
              open={showAll}
              onToggle={() => setShowAll((v) => !v)}
              more={`הצג את כל ${rows.length} מילות המפתח`}
            />
          )}
          <Note>
            {money(noLeadCost)} מתוך {money(data.cost)} ({wholePct(noLeadCost, data.cost)}%) הלכו על מילים שלא הביאו אף
            פנייה.{' '}
            {data.organicLoaded
              ? `על ${absent.length} מתוך ${rows.length} המילים (${money(absentCost)}) האתר לא מופיע בכלל בחיפוש האורגני, ולכן כל ביקור מהן עולה כסף.`
              : 'המיקום האורגני לא נטען כרגע.'}
            {data.unmatched.leads > 0 &&
              ` ${data.unmatched.leads} פניות מהפרסום הגיעו עם מילה שאין לה עלות בטווח (${data.unmatched.terms.join(', ')}).`}
          </Note>
        </>
      )}

      {data.organicLoaded && (
        <CardPart>
          <SubHead title="מופיעים באורגני, לא בפרסום" aside="חיפושים עם הופעות, בלי מותג" />
          {data.organicNotPaid.length === 0 ? (
            <Empty>אין כרגע חיפושים כאלה.</Empty>
          ) : (
            <p className="text-[12px] md:text-[13px] text-stone-600 leading-relaxed">
              {data.organicNotPaid.map((q) => `${q.query} (${q.impressions}, מקום ${q.position})`).join(' · ')}
            </p>
          )}
          <Note>
            חיפושים שגוגל כבר מציגה בהם את האתר, ואין עליהם מודעה. המספר בסוגריים הוא הופעות. כשהמיקום רחוק, אלה מועמדים
            טבעיים לבדיקה כמילות מפתח, או לחיזוק העמוד.
          </Note>
        </CardPart>
      )}
    </Card>
  );
}

function Terms({ data }: { data: Loaded }) {
  const [showAll, setShowAll] = useState(false);
  const candidates = data.searchTerms.filter((t) => t.cost > 0 && t.keyEvents === 0);
  const shown = showAll ? candidates : candidates.slice(0, TERMS_SHOWN);
  const candidatesCost = candidates.reduce((a, t) => a + t.cost, 0);

  return (
    <Card title="מונחי חיפוש" sub={`מה אנשים באמת הקלידו לפני שלחצו על המודעה, מ-${heDate(data.termsSince)}`}>
      <StatGrid>
        <Stat label="עלות כוללת" value={money(data.termsCost)} />
        <Stat
          label="מתוכה במונחים גלויים"
          value={money(data.visibleTermsCost)}
          rate={data.termsCost > 0 ? wholePct(data.visibleTermsCost, data.termsCost) : null}
          sub={`${data.searchTerms.length} מונחים`}
        />
        <Stat label="בלי שום המרה" value={money(candidatesCost)} sub={`${candidates.length} מונחים`} />
      </StatGrid>

      <CardPart>
        <SubHead title="מועמדים להחרגה" aside="לבדיקה בלבד" />
        {candidates.length === 0 ? (
          <Empty>אין מונחים עם עלות ובלי המרה.</Empty>
        ) : (
          <>
            <table className="w-full text-[12px] md:text-[13px] tabular-nums">
              <thead className="text-stone-400 text-[11px] md:text-[12px]">
                <tr>
                  <Th>מונח חיפוש</Th>
                  <Th end>עלות</Th>
                  <Th end>לחיצות</Th>
                </tr>
              </thead>
              <tbody className="text-stone-700">
                {shown.map((t) => (
                  <tr key={t.term} className="border-t border-stone-100">
                    <td className="py-1.5 px-1">{t.term}</td>
                    <td className="text-end px-1">{money(t.cost)}</td>
                    <td className="text-end px-1">{t.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {candidates.length > TERMS_SHOWN && (
              <ShowMore
                open={showAll}
                onToggle={() => setShowAll((v) => !v)}
                more={`הצג את כל ${candidates.length} המונחים`}
              />
            )}
          </>
        )}
        <Note>
          מונחים שעלו כסף ולא הובילו לאף המרה שמוגדרת ב-GA4, מסודרים לפי עלות. שווה לעבור עליהם ולהחליט בגוגל אדס מה
          להחריג, למשל שמות של מטפלים אחרים או חיפושים על תרופות. כאן לא משתנה כלום בחשבון הפרסום. גוגל מסתירה מונחים
          נדירים, ולכן רק {wholePct(data.visibleTermsCost, data.termsCost)}% מהעלות מופיעה כאן.
        </Note>
      </CardPart>
    </Card>
  );
}

export default function GoogleSection({ data, failed }: { data: GoogleAds | null; failed: boolean }) {
  if (failed) {
    return (
      <Card>
        <Empty>לא הצלחנו לטעון נתונים מגוגל כרגע.</Empty>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <Empty>טוען נתונים מגוגל...</Empty>
      </Card>
    );
  }
  if (!data.configured) {
    return (
      <Card>
        <Empty>אין חיבור לגוגל (חסרים משתני סביבה).</Empty>
      </Card>
    );
  }
  return (
    <>
      <Cost data={data} />
      <Keywords data={data} />
      <Terms data={data} />
    </>
  );
}
