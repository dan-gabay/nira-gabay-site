// Reads the analytics payload and says, in words, the two or three things in
// it that would change a decision.
//
// The dashboard already shows every number. A number is not an insight: 98
// visits to /services/adult-therapy and 1 enquiry are two figures on two
// different cards, and the sentence that joins them - the busiest page on the
// site converts one visit in a hundred - is the whole point.
//
// Rules, deliberately:
// - Nothing is claimed below a minimum sample. Under the site's current volume
//   most of these stay silent, which is correct; a confident sentence about
//   four sessions is worse than no sentence.
// - Nothing is invented. Every line is arithmetic on figures in the payload,
//   and each one names the counts it was derived from so it can be checked.
// - Ordered by what it would change, not by how large the number is.

import { enquiries, visits as visitCount } from './heCount';

export type InsightTone = 'good' | 'warn' | 'neutral';
export type Insight = { tone: InsightTone; text: string };

type Totals = { views: number; visits: number; conversions: number; signups: number };

export type InsightInput = {
  totals: Totals;
  previous: Totals;
  range_days: number;
  traffic?: Array<{ grp: string; kind: string; detail: string | null; visits: number; conversions: number }>;
  service_funnel?: Array<{ slug: string; views: number; visits: number; conversions: number }>;
  by_hour?: Array<{ hour: number; visits: number; conversions: number }>;
  devices?: Array<{ device: string; n: number }>;
  engagement?: {
    visits: number;
    one_page_visits: number;
    deep_visits: number;
    article_reads: number;
    article_completed: number;
  };
  landing_pages?: Array<{ path: string; page_type: string; visits: number; conversions: number }>;
  engagement_by_source?: Array<{
    grp: string;
    visits: number;
    views: number;
    one_page_visits: number;
    deep_visits: number;
    conversions: number;
  }>;
  returning?: {
    known_visits: number;
    new_visits: number;
    returning_visits: number;
    new_conversions: number;
    returning_conversions: number;
    median_visit_at_conversion: number | null;
  };
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const round1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function buildInsights(d: InsightInput, serviceName: (slug: string) => string): Insight[] {
  const out: Insight[] = [];
  const { totals, previous } = d;
  const visits = totals.visits;

  // 1. The headline rate. Everything else is a variation on it, so it goes
  //    first and the rest of the list is allowed to assume it.
  if (visits >= 20) {
    const r = pct(totals.conversions, visits);
    const prevR = previous.visits >= 20 ? pct(previous.conversions, previous.visits) : null;
    out.push({
      tone: r >= 3 ? 'good' : 'warn',
      text:
        `${enquiries(totals.conversions)} מתוך ${visitCount(visits)} - ${r}%` +
        (prevR === null ? '' : `, לעומת ${prevR}% בתקופה הקודמת`) +
        '.',
    });
  }

  // 2. A service page carrying real traffic and not turning it into anything.
  //    This is where the ad budget lands, so it outranks everything below.
  const worstService = (d.service_funnel || [])
    .filter((s) => s.visits >= 25)
    .sort((a, b) => a.conversions / a.visits - b.conversions / b.visits)[0];
  if (worstService) {
    const r = pct(worstService.conversions, worstService.visits);
    if (r <= 2) {
      out.push({
        tone: 'warn',
        text:
          `העמוד "${serviceName(worstService.slug)}" קיבל ${visitCount(worstService.visits)}, ` +
          `${enquiries(worstService.conversions)} (${r}%). זה העמוד שהמודעות נוחתות עליו.`,
      });
    }
  }

  // 3. Paid against free, and whether the paid half is actually better. Both
  //    sides need a sample of their own before the comparison means anything.
  const traffic = d.traffic || [];
  const sum = (kind: string, key: 'visits' | 'conversions') =>
    traffic.filter((t) => t.kind === kind).reduce((a, t) => a + t[key], 0);
  const paidV = sum('paid', 'visits');
  const paidC = sum('paid', 'conversions');
  const freeV = sum('organic', 'visits') + sum('direct', 'visits');
  const freeC = sum('organic', 'conversions') + sum('direct', 'conversions');
  if (paidV >= 25 && freeV >= 25) {
    const pr = pct(paidC, paidV);
    const fr = pct(freeC, freeV);
    out.push({
      tone: pr >= fr ? 'good' : 'warn',
      text:
        `תנועה ממומנת: ${visitCount(paidV)}, ${enquiries(paidC)} (${pr}%). ` +
        `תנועה חינמית: ${visitCount(freeV)}, ${enquiries(freeC)} (${fr}%).`,
    });
  } else if (paidV >= 25) {
    out.push({
      tone: 'neutral',
      text: `${pct(paidV, visits)}% מהביקורים הגיעו ממודעות בתשלום (${visitCount(paidV)}, ${enquiries(paidC)}).`,
    });
  }

  // 4. A keyword paying for clicks that never enquire. Only worth saying once
  //    it has had enough clicks to have been given a fair chance.
  const deadKeyword = traffic
    .filter((t) => t.grp === 'google_ads' && t.conversions === 0 && t.visits >= 20)
    .sort((a, b) => b.visits - a.visits)[0];
  if (deadKeyword?.detail) {
    out.push({
      tone: 'warn',
      text: `מילת החיפוש "${deadKeyword.detail}" הביאה ${deadKeyword.visits} קליקים בתשלום ואף לא פנייה אחת.`,
    });
  }

  // 5. The gap the traffic cards cannot show. Both sides are visits up there
  //    and look alike; the difference is what happens after the page loads,
  //    and it is the difference between buying traffic and buying readers.
  const quality = d.engagement_by_source || [];
  const perVisit = (grp: string) => {
    const r = quality.find((x) => x.grp === grp);
    return r && r.visits >= 20 ? r.views / r.visits : null;
  };
  const organicDepth = perVisit('organic_search');
  const paidDepth = perVisit('google_ads');
  if (organicDepth !== null && paidDepth !== null && organicDepth >= paidDepth * 1.5) {
    out.push({
      tone: 'neutral',
      text:
        `מי שמגיע מחיפוש אורגני קורא ${round1(organicDepth)} עמודים לביקור, ` +
        `לעומת ${round1(paidDepth)} ממודעות בתשלום.`,
    });
  }

  // 6. When enquiries actually arrive - the one figure here that maps onto a
  //    setting, since ad scheduling is set by hour.
  const hours = d.by_hour || [];
  const convHours = hours.filter((h) => h.conversions > 0);
  const totalConvInHours = convHours.reduce((a, h) => a + h.conversions, 0);
  if (totalConvInHours >= 5) {
    const best = [...convHours].sort((a, b) => b.conversions - a.conversions)[0];
    out.push({
      tone: 'neutral',
      text:
        `שעת השיא לפניות היא ${String(best.hour).padStart(2, '0')}:00 ` +
        `(${best.conversions} מתוך ${totalConvInHours} הפניות שנמדדו לפי שעה).`,
    });
  }

  // 7. How many leave from the page they landed on. High on every site; worth
  //    a line only when it is high enough to be the constraint.
  const eng = d.engagement;
  if (eng && eng.visits >= 30) {
    const share = pct(eng.one_page_visits, eng.visits);
    if (share >= 60) {
      out.push({
        tone: 'warn',
        text: `${share}% מהביקורים נגמרים בעמוד שנחתו עליו, בלי לעבור לעמוד נוסף.`,
      });
    }
  }

  // 8. Which screen the site is actually read on. Decides where a change gets
  //    checked before it ships.
  const devices = d.devices || [];
  const deviceTotal = devices.reduce((a, x) => a + x.n, 0);
  const mobile = devices.find((x) => x.device === 'mobile');
  if (deviceTotal >= 30 && mobile && pct(mobile.n, deviceTotal) >= 65) {
    out.push({
      tone: 'neutral',
      text: `${pct(mobile.n, deviceTotal)}% מהגולשים מגיעים מהטלפון.`,
    });
  }

  // 9. Whether anyone comes back. Last, because it is the slowest number on
  //    the page to mean anything - it only counts browsers that have been here
  //    since the counter was added, so it stays silent for weeks and then
  //    starts being true.
  const ret = d.returning;
  if (ret && ret.known_visits >= 30) {
    const back = pct(ret.returning_visits, ret.known_visits);
    if (back >= 10) {
      out.push({
        tone: 'good',
        text:
          `${back}% מהביקורים הם של מי שכבר היה כאן` +
          (ret.median_visit_at_conversion !== null && ret.median_visit_at_conversion > 1
            ? `, וחצי מהפניות מגיעות רק בביקור ה-${round1(ret.median_visit_at_conversion)} ומעלה.`
            : '.'),
      });
    }
  }

  return out.slice(0, 6);
}
