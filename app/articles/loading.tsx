// Mirrors the real /articles layout (teal hero -> search pill -> chip row ->
// horizontal card rows) so nothing jumps when the content arrives.
export default function ArticlesLoading() {
  return (
    <div style={{ paddingTop: '80px' }}>
      {/* Hero */}
      <div className="bg-[#1A4A44] pt-6 pb-16 md:pt-14 md:pb-28">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-2xl mx-auto text-center animate-pulse">
            <div className="h-px w-10 md:w-12 bg-white/25 mx-auto mb-4 md:mb-6" />
            <div className="h-8 md:h-14 bg-white/15 rounded-lg w-40 md:w-64 mx-auto mb-2 md:mb-4" />
            <div className="h-4 md:h-5 bg-white/10 rounded w-64 md:w-96 mx-auto mb-2" />
            <div className="h-4 md:h-5 bg-white/10 rounded w-48 md:w-72 mx-auto" />
          </div>
        </div>
      </div>

      {/* Search pill straddling the hero edge */}
      <div className="relative z-20 container mx-auto px-4 md:px-8 -mt-6 md:-mt-9">
        <div className="max-w-2xl mx-auto">
          <div className="h-[50px] md:h-[58px] bg-white rounded-full shadow-xl border border-stone-100 animate-pulse" />
        </div>
      </div>

      {/* Chips */}
      <div className="container mx-auto px-4 md:px-8 pt-4 md:pt-6">
        <div className="flex items-center gap-2 md:gap-2.5 md:justify-center animate-pulse">
          {[16, 20, 24, 20, 28].map((w, i) => (
            <div
              key={i}
              className="h-10 md:h-11 bg-stone-200 rounded-full flex-shrink-0"
              style={{ width: `${w * 4}px` }}
            />
          ))}
        </div>
      </div>

      {/* Card rows */}
      <div className="py-5 md:py-10 bg-gradient-to-b from-white to-stone-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-3 md:max-w-none md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-stretch gap-3 bg-white rounded-2xl p-2.5 shadow-sm border border-stone-100 animate-pulse md:flex-col-reverse md:gap-0 md:p-0 md:overflow-hidden"
              >
                <div className="flex-1 min-w-0 md:p-5">
                  <div className="h-5 md:h-6 bg-stone-200 rounded w-3/4 mb-2" />
                  <div className="h-3 md:h-4 bg-stone-200 rounded w-full mb-1.5" />
                  <div className="h-3 md:h-4 bg-stone-200 rounded w-5/6" />
                </div>
                <div className="w-24 flex-shrink-0 min-h-[86px] bg-stone-200 rounded-xl md:w-full md:min-h-0 md:aspect-[16/9] md:rounded-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
