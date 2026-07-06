import { faqSchema } from '@/lib/faqSchema';

// Visible FAQ built from the same content that already feeds the FAQPage
// JSON-LD - one source of truth for humans and crawlers.
// <details>/<summary> keeps it accessible with zero client JS.
export default function FaqSection() {
  const items = faqSchema.mainEntity.map((q) => ({
    question: q.name,
    answer: q.acceptedAnswer.text,
  }));

  return (
    <section className="py-20 bg-stone-50" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-stone-800 mb-10 text-center">
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
        </div>
      </div>
    </section>
  );
}
