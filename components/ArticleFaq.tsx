// Visible FAQ for article pages, rendered from the same faq jsonb that feeds
// the FAQPage JSON-LD - one source of truth for humans and crawlers, matching
// Google's requirement that marked-up FAQ content be visible on the page.
// <details>/<summary> keeps it accessible with zero client JS (same pattern
// as the homepage FaqSection).

type FaqItem = { question: string; answer: string };

function extractItems(faq: unknown): FaqItem[] {
  if (!faq || typeof faq !== 'object') return [];
  const mainEntity = (faq as { mainEntity?: unknown }).mainEntity;
  if (!Array.isArray(mainEntity)) return [];
  return mainEntity
    .map((q: any) => ({
      question: typeof q?.name === 'string' ? q.name : '',
      answer: typeof q?.acceptedAnswer?.text === 'string' ? q.acceptedAnswer.text : '',
    }))
    .filter((i) => i.question && i.answer);
}

export default function ArticleFaq({ faq }: { faq: unknown }) {
  const items = extractItems(faq);
  if (items.length === 0) return null;

  return (
    <section className="my-12" aria-labelledby="article-faq-heading">
      <h2 id="article-faq-heading" className="text-2xl font-bold text-stone-800 mb-6 font-serif">
        שאלות נפוצות
      </h2>
      <div className="space-y-4">
        {items.map((item) => (
          <details
            key={item.question}
            className="group bg-white rounded-2xl border border-stone-200 shadow-sm open:shadow-md transition-shadow"
          >
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 min-h-[44px] text-lg font-semibold text-stone-800 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-amber-600 text-2xl leading-none transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-6 pb-6 text-stone-600 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
