// Shared by the analytics sources table, the enquiry log and the source mix
// chart. The table that used to live here was folded into
// components/manage/analytics/SourcesTable.tsx.

export type TrafficRow = {
  grp: string;
  kind: 'paid' | 'organic' | 'direct' | string;
  detail: string | null;
  visits: number;
  conversions: number;
};

// Exported: the source-over-time chart labels the same seven groups, and two
// copies of these strings would drift the moment one of them was reworded.
export const GROUP_LABELS: Record<string, string> = {
  google_ads: 'גוגל - מודעות בתשלום',
  paid_other: 'ממומן - פלטפורמה אחרת',
  organic_search: 'חיפוש אורגני בגוגל',
  social: 'פייסבוק ואינסטגרם',
  ai_referral: 'המלצת כלי AI',
  direct: 'ישיר - הקלדה או שמירה',
  referral: 'אתרים אחרים',
};
