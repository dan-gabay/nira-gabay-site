'use client';

import { useState } from 'react';
import { AiFetchBars, AI_ANSWER_COLOR, AI_SERIES, alignToBuckets } from '@/components/manage/Charts';
import { BarList, Card, CardPart, Empty, Note, ShowMore, Stat, StatGrid, SubHead, type BarRow } from './ui';
import { heDate } from './Overview';
import { pageName } from './labels';
import type { SiteBehavior } from './types';

// "האם כלי AI משתמשים באתר?" Nobody from an AI tool shows up as a visit unless
// they click a link in the answer, and those few are already a row in the
// sources table. What this section shows is the step before that: the tools
// reading the site at all.
//
// Two kinds, kept apart because they mean different things:
//   crawler - a tool indexing or training on its own schedule. Volume says the
//             site is known to it, not that anyone asked about it.
//   answer  - an assistant opening a page in the middle of answering a person.
//             That is the site being used as a source, right then.
// Search crawlers are on the chart as the yardstick: "a lot" means nothing
// until it sits next to Google.

const PAGES_SHOWN = 6;

export function AiSection({
  data,
  buckets,
  prevComplete,
  articleTitles,
}: {
  data: SiteBehavior | null;
  buckets: string[];
  /** False while the previous window reaches back before bot_hits existed. */
  prevComplete: boolean;
  articleTitles: Map<string, string>;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!data) {
    return (
      <Card>
        <Empty>טוען...</Empty>
      </Card>
    );
  }

  const t = data.ai_totals;
  const p = data.ai_previous;
  const titles = new Map(articleTitles);
  for (const r of data.ai_pages) {
    if (r.title && r.path.startsWith('/articles/')) titles.set(r.path.slice(10), r.title);
  }
  const name = (path: string) => pageName(path, titles);

  if (t.crawler + t.answer + t.search === 0) {
    return (
      <Card>
        <Empty>אף כלי AI או מנוע חיפוש לא נרשם בטווח הזה.</Empty>
      </Card>
    );
  }

  const answered: BarRow[] = data.ai_pages
    .filter((r) => r.answer > 0)
    .map((r) => ({ key: r.path, label: name(r.path), value: r.answer }));
  const crawled: BarRow[] = data.ai_pages
    .filter((r) => r.crawler > 0)
    .sort((a, b) => b.crawler - a.crawler)
    .map((r) => ({ key: r.path, label: name(r.path), value: r.crawler }));
  const crawledShown = showAll ? crawled : crawled.slice(0, PAGES_SHOWN);

  const d = (now: number, prev: number) => (prevComplete ? ({ kind: 'count', now, prev } as const) : null);
  const ratio = t.search > 0 ? t.crawler / t.search : null;

  return (
    <Card>
      <StatGrid>
        <Stat
          label="נפתח תוך כדי תשובה"
          value={t.answer}
          sub={t.answer_paths === 1 ? 'עמוד אחד' : `${t.answer_paths} עמודים שונים`}
          delta={d(t.answer, p.answer)}
          color={AI_ANSWER_COLOR}
        />
        <Stat
          label="סריקות של כלי AI"
          value={t.crawler}
          sub={`${t.crawler_paths} עמודים שונים`}
          delta={d(t.crawler, p.crawler)}
          color={AI_SERIES[0].color}
        />
        <Stat
          label="סריקות של מנועי חיפוש"
          value={t.search}
          sub="גוגל, בינג ודומיהם"
          delta={d(t.search, p.search)}
          color={AI_SERIES[1].color}
        />
        <Stat
          label="AI מול חיפוש"
          value={ratio === null ? '-' : ratio >= 10 ? `פי ${Math.round(ratio)}` : `פי ${Math.round(ratio * 10) / 10}`}
          sub="סריקות AI על כל סריקת חיפוש"
        />
      </StatGrid>

      <div className="mt-4">
        <AiFetchBars
          data={alignToBuckets(data.ai_daily, buckets, () => ({ crawler: 0, answer: 0, search: 0 }))}
          granularity={data.granularity}
        />
      </div>

      <CardPart>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          <div className="min-w-0">
            <SubHead title="מאילו עמודים ענו" aside="פתיחות" />
            <BarList rows={answered} color={AI_ANSWER_COLOR} empty="אף עמוד לא נפתח תוך כדי תשובה בטווח הזה." />
          </div>
          <div className="min-w-0">
            <SubHead title="מה נסרק הכי הרבה" aside="סריקות" />
            <BarList rows={crawledShown} color={AI_SERIES[0].color} />
            {crawled.length > PAGES_SHOWN && (
              <ShowMore open={showAll} onToggle={() => setShowAll((v) => !v)} more={`הצג ${crawled.length} עמודים`} />
            )}
          </div>
        </div>
      </CardPart>

      <Note>
        סריקה היא כלי שקורא את האתר בזמן שלו, כדי להכיר אותו. פתיחה תוך כדי תשובה היא כלי כמו ChatGPT שפתח עמוד כי
        מישהו שאל אותו משהו עכשיו, כלומר האתר שימש מקור לתשובה. אף אחד מהם אינו ביקור, והם לא נספרים בשום מספר אחר
        בעמוד. מי שלחץ על קישור בתשובה ונכנס מופיע במקורות התנועה.
        {data.ai_first_hit && <> המדידה פועלת מ-{heDate(data.ai_first_hit)}.</>}
      </Note>
    </Card>
  );
}
