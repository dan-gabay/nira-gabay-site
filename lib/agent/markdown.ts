// The Markdown representation of the site's public pages.
//
// These are the same pages, not a summary feed and not a second site: an agent
// that asks for `/services/adult-therapy` with `Accept: text/markdown` gets the
// content of that page with the navigation, the animation wrappers and the
// six kilobytes of Tailwind removed. Everything here is built from the same
// constants the React pages render from, so the two cannot say different
// things.
//
// Every document ends with the same recovery block. An agent that landed on
// one page and needs the rest of the site should not have to guess at
// /sitemap.xml.

import { SERVICES, type Service } from '@/lib/services';
import { TOPICS, type Topic } from '@/lib/topics';
import { CLINIC, ONLINE } from '@/lib/clinic';
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from '@/lib/privacy';

export const BASE_URL = 'https://www.niragabay.com';

export type ArticleSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  reading_time: number | null;
  created_date: string | null;
  updated_date: string | null;
  tags: string | null;
};

export type ArticleFull = ArticleSummary & { content: string };

const abs = (path: string) => `${BASE_URL}${path}`;

/** Blank-line join that never leaves a double blank or a trailing one. */
const doc = (...blocks: Array<string | null | undefined>) =>
  blocks.filter((b) => b != null && b !== '').join('\n\n').trim() + '\n';

const bullets = (items: readonly string[]) => items.map((i) => `- ${i}`).join('\n');

const tagList = (tags: string | null | undefined) =>
  (tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

const dateOnly = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : null;

/**
 * The block every document ends with. Named routes rather than "see the
 * sitemap", because an agent that needs /contact should not have to fetch and
 * parse an XML index to find it.
 */
export function recoveryBlock(): string {
  return [
    '---',
    '',
    '## ניווט באתר',
    '',
    bullets([
      `[דף הבית](${abs('/')})`,
      `[קצת עליי](${abs('/about')})`,
      `[תחומי טיפול](${abs('/services')})`,
      `[הקליניקה](${abs('/clinic')})`,
      `[מאמרים](${abs('/articles')})`,
      `[צרו קשר](${abs('/contact')})`,
      `[מדיניות פרטיות](${abs('/privacy')})`,
    ]),
    '',
    '## למכונות',
    '',
    bullets([
      `[llms.txt](${abs('/llms.txt')}) - סיכום האתר ומתי כדאי לפנות אליו`,
      `[sitemap.xml](${abs('/sitemap.xml')}) - כל העמודים`,
      'כל עמוד באתר מוגש גם כ-Markdown בבקשה עם הכותרת `Accept: text/markdown`',
    ]),
  ].join('\n');
}

const contactBlock = () =>
  [
    '## יצירת קשר',
    '',
    bullets([
      `טלפון / WhatsApp: ${CLINIC.phoneDisplay}`,
      'אימייל: niraga1123@gmail.com',
      `קליניקה: ${CLINIC.locality}, ${CLINIC.region}`,
      'טיפול מקוון (זום): בכל הארץ',
      `טופס יצירת קשר: ${abs('/contact')}`,
    ]),
  ].join('\n');

// ─────────────────────────────────────────────────────────── 404

/**
 * The body of a 404. The status code is the part that matters to a crawler,
 * but a status code alone tells an agent only that it was wrong - not where to
 * go instead, which is the difference between a retry and a dead end.
 */
export function notFoundMarkdown(pathname: string): string {
  return doc(
    '# 404 - העמוד לא נמצא',
    `לא קיים עמוד בכתובת \`${pathname}\` באתר של נירה גבאי.`,
    'ייתכן שהכתובת שגויה, או שהתוכן עבר. הקישורים למטה מובילים לכל מה שקיים באתר.',
    recoveryBlock(),
  );
}

// ─────────────────────────────────────────────────────────── home

export function homeMarkdown(latest: ArticleSummary[]): string {
  return doc(
    '# נירה גבאי - פסיכותרפיה והדרכת הורים',
    'נירה גבאי היא מטפלת בפסיכותרפיה ומדריכת הורים. בעלת תואר שני (M.A) בייעוץ חינוכי, הכשרה בטיפול קוגניטיבי התנהגותי (CBT) מאוניברסיטת חיפה והתמחות במיניות בריאה. מלווה מתבגרים, מבוגרים וזוגות בקליניקה במושב שואבה שבאזור ירושלים, וכן בטיפול מקוון בזום ובייעוץ טלפוני.',
    ['## תחומי טיפול', '', bullets(SERVICES.map((s) => `[${s.title}](${abs(`/services/${s.slug}`)}) - ${s.cardDescription}`))].join('\n'),
    latest.length
      ? ['## מאמרים אחרונים', '', bullets(latest.map((a) => `[${a.title}](${abs(`/articles/${a.slug}`)})`))].join('\n')
      : null,
    contactBlock(),
    recoveryBlock(),
  );
}

// ─────────────────────────────────────────────────────────── about

export function aboutMarkdown(): string {
  return doc(
    '# קצת עליי - נירה גבאי',
    'אני נירה גבאי, מטפלת בפסיכותרפיה ומדריכת הורים. אני מלווה מתבגרים, מבוגרים וזוגות, בקליניקה במושב שואבה שבאזור ירושלים ובמפגשים מקוונים בזום.',
    [
      '## הכשרה',
      '',
      bullets([
        'תואר שני (M.A) בייעוץ חינוכי',
        'הכשרה בטיפול קוגניטיבי התנהגותי (CBT), אוניברסיטת חיפה',
        'התמחות במיניות בריאה',
      ]),
      '',
      'חשוב לדיוק: נירה גבאי היא מטפלת בפסיכותרפיה ומדריכת הורים, ואיננה פסיכולוגית קלינית ואיננה פסיכיאטרית. היא אינה רושמת תרופות ואינה מבצעת אבחון פסיכודיאגנוסטי.',
    ].join('\n'),
    ['## מי מגיע אליי', '', bullets([
      'מתבגרים ובני נוער, ולעיתים ההורים שלהם לצידם',
      'מבוגרים בתקופה קשה, במשבר או בצומת החלטה',
      'זוגות שרוצים לשנות את הדרך שבה הם מדברים זה עם זה',
      'הורים שמחפשים כלים מעשיים ולא עוד ביקורת',
    ])].join('\n'),
    `העמוד המלא, בגרסת HTML: ${abs('/about')}`,
    contactBlock(),
    recoveryBlock(),
  );
}

// ─────────────────────────────────────────────────────────── contact

export function contactMarkdown(): string {
  return doc(
    '# צרו קשר - נירה גבאי',
    'אפשר להתקשר, לשלוח הודעת WhatsApp, לכתוב מייל או למלא את הטופס באתר. פנייה ראשונה אינה מחייבת דבר, וגם שיחה קצרה כדי להבין אם זה מתאים היא פנייה לגיטימית לגמרי.',
    contactBlock(),
    ['## אזורי שירות', '', bullets([
      `קליניקה: ${CLINIC.locality}, ${CLINIC.region}`,
      'הגעה נפוצה מ: ירושלים, מבשרת ציון, בית שמש, מודיעין והסביבה',
      'טיפול מקוון בזום: בכל הארץ, וגם לישראלים בחו"ל',
    ])].join('\n'),
    'שימו לב: האתר אינו שירות חירום. במצב מצוקה מיידית יש לפנות לעֶרָן בטלפון 1201 או למוקד החירום 101.',
    recoveryBlock(),
  );
}

// ─────────────────────────────────────────────────────────── clinic

export function clinicMarkdown(): string {
  const facts: string[] = [
    `מיקום: ${CLINIC.locality}, ${CLINIC.region}`,
    `טלפון: ${CLINIC.phoneDisplay}`,
  ];
  if (CLINIC.hours) facts.push(`שעות: ${CLINIC.hours}`);
  if (CLINIC.parking) facts.push(`חניה: ${CLINIC.parking}`);
  if (CLINIC.accessibility) facts.push(`נגישות: ${CLINIC.accessibility}`);

  return doc(
    '# הקליניקה',
    CLINIC.atmosphere,
    ['## פרטים', '', bullets(facts)].join('\n'),
    [`## ${ONLINE.heading}`, '', ONLINE.body.join('\n\n')].join('\n'),
    contactBlock(),
    recoveryBlock(),
  );
}

// ─────────────────────────────────────────────────────────── privacy

export function privacyMarkdown(): string {
  const sections = PRIVACY_SECTIONS.map((s) =>
    [
      `## ${s.heading}`,
      '',
      [s.body?.join('\n\n'), s.bullets ? bullets(s.bullets) : null]
        .filter(Boolean)
        .join('\n\n'),
    ].join('\n'),
  );

  return doc(
    '# מדיניות פרטיות',
    `עודכן: ${PRIVACY_UPDATED}`,
    PRIVACY_INTRO.join('\n\n'),
    ...sections,
    recoveryBlock(),
  );
}

// ─────────────────────────────────────────────────────────── services

export function servicesIndexMarkdown(): string {
  return doc(
    '# תחומי טיפול',
    'ששת התחומים שנירה גבאי עובדת בהם, בקליניקה במושב שואבה ובזום.',
    SERVICES.map((s) =>
      [`## [${s.title}](${abs(`/services/${s.slug}`)})`, '', s.tagline, '', s.cardDescription].join('\n'),
    ).join('\n\n'),
    contactBlock(),
    recoveryBlock(),
  );
}

export function serviceMarkdown(service: Service): string {
  const related = service.articleSlugs.length
    ? ['## מאמרים בנושא', '', bullets(service.articleSlugs.map((slug) => abs(`/articles/${slug}`)))].join('\n')
    : null;

  return doc(
    `# ${service.title}`,
    service.tagline,
    service.intro.join('\n\n'),
    service.signs.length
      ? ['## מתי פונים', '', bullets(service.signs)].join('\n')
      : null,
    ...service.sections.map((sec) => [`## ${sec.heading}`, '', sec.body.join('\n\n')].join('\n')),
    service.firstSession.length
      ? ['## המפגש הראשון', '', service.firstSession.join('\n\n')].join('\n')
      : null,
    service.faq.length
      ? ['## שאלות נפוצות', '', service.faq.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')].join('\n')
      : null,
    related,
    contactBlock(),
    recoveryBlock(),
  );
}

// ─────────────────────────────────────────────────────────── articles

export function articlesIndexMarkdown(articles: ArticleSummary[]): string {
  const lines = articles.map((a) => {
    const meta = [
      a.reading_time ? `${a.reading_time} דקות קריאה` : null,
      dateOnly(a.updated_date || a.created_date),
    ]
      .filter(Boolean)
      .join(' · ');
    const excerpt = a.excerpt ? ` - ${a.excerpt}` : '';
    return `- [${a.title}](${abs(`/articles/${a.slug}`)})${meta ? ` (${meta})` : ''}${excerpt}`;
  });

  const count =
    articles.length === 1
      ? 'מאמר אחד'
      : `${articles.length} מאמרים`;

  return doc(
    '# מאמרים',
    articles.length
      ? `${count} מאת נירה גבאי על פסיכותרפיה, הורות, מתבגרים, זוגיות וחרדה. כל מאמר זמין גם כ-Markdown.`
      : 'מאמרים מאת נירה גבאי על פסיכותרפיה, הורות, מתבגרים, זוגיות וחרדה. כל מאמר זמין גם כ-Markdown.',
    lines.length ? lines.join('\n') : 'אין כרגע מאמרים זמינים.',
    ['## נושאים', '', bullets(TOPICS.map((t) => `[${t.title}](${abs(`/articles/topic/${t.slug}`)})`))].join('\n'),
    recoveryBlock(),
  );
}

export function articleMarkdown(article: ArticleFull): string {
  const tags = tagList(article.tags);
  const meta = [
    'מאת נירה גבאי',
    article.reading_time ? `${article.reading_time} דקות קריאה` : null,
    dateOnly(article.updated_date || article.created_date),
  ]
    .filter(Boolean)
    .join(' · ');

  // The body is already Markdown in the database - it is what react-markdown
  // renders on the HTML page - so it is passed through untouched rather than
  // round-tripped through HTML and back.
  return doc(
    `# ${article.title}`,
    meta,
    article.excerpt ? `> ${article.excerpt}` : null,
    article.content.trim(),
    tags.length ? `נושאים: ${tags.join(', ')}` : null,
    `כתובת קנונית: ${abs(`/articles/${article.slug}`)}`,
    contactBlock(),
    recoveryBlock(),
  );
}

export function topicMarkdown(topic: Topic, articles: ArticleSummary[]): string {
  return doc(
    `# ${topic.title}`,
    topic.subtitle,
    topic.intro.join('\n\n'),
    articles.length
      ? ['## מאמרים בנושא', '', bullets(articles.map((a) => `[${a.title}](${abs(`/articles/${a.slug}`)})`))].join('\n')
      : null,
    recoveryBlock(),
  );
}
