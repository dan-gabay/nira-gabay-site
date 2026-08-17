export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-stone-50" style={{ paddingTop: '80px' }}>
      {/* Breadcrumb Skeleton */}
      <div className="bg-stone-50 py-2.5 border-b border-stone-100">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="h-4 bg-stone-200 rounded w-64 animate-pulse"></div>
        </div>
      </div>

      {/* Header Skeleton */}
      <section className="py-4 md:py-6 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl animate-pulse">
          {/* Tags Skeleton */}
          <div className="flex gap-1.5 md:gap-2 mb-2.5 md:mb-3">
            <div className="h-6 bg-stone-200 rounded-full w-20"></div>
            <div className="h-6 bg-stone-200 rounded-full w-24"></div>
            <div className="h-6 bg-stone-200 rounded-full w-20"></div>
          </div>
          
          {/* Title Skeleton */}
          <div className="space-y-2 mb-2.5">
            <div className="h-7 md:h-9 bg-stone-200 rounded-lg w-full"></div>
            <div className="h-7 md:h-9 bg-stone-200 rounded-lg w-5/6"></div>
          </div>
          
          {/* Excerpt Skeleton */}
          <div className="space-y-2 mb-3 md:mb-4">
            <div className="h-4 md:h-5 bg-stone-200 rounded-lg w-full"></div>
            <div className="h-4 md:h-5 bg-stone-200 rounded-lg w-4/5"></div>
          </div>
          
          {/* Meta Info Skeleton */}
          <div className="flex flex-wrap gap-x-3 gap-y-2 md:gap-6 pb-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-stone-200 rounded-full"></div>
              <div className="h-4 bg-stone-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-stone-200 rounded w-28"></div>
            <div className="h-4 bg-stone-200 rounded w-20"></div>
            <div className="h-4 bg-stone-200 rounded w-16"></div>
          </div>
        </div>
      </section>

      {/* Featured Image Skeleton */}
      <section className="pt-4 md:pt-6">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="relative w-full aspect-[16/9] bg-stone-200 rounded-xl animate-pulse overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 animate-shimmer"></div>
          </div>
        </div>
      </section>

      {/* Content Skeleton */}
      <section className="pt-5 md:pt-6 pb-10 md:pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <article className="max-w-none animate-pulse">
            {/* Paragraph blocks */}
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-3">
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-11/12"></div>
                <div className="h-4 bg-stone-200 rounded w-full"></div>
              </div>
              
              {/* Heading */}
              <div className="h-8 bg-stone-200 rounded w-3/4 mt-8"></div>
              
              <div className="space-y-3">
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-10/12"></div>
              </div>
              
              {/* Quote or Highlight */}
              <div className="bg-stone-100 p-6 rounded-lg">
                <div className="h-4 bg-stone-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-stone-200 rounded w-5/6"></div>
              </div>
              
              <div className="space-y-3">
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-9/12"></div>
              </div>
              
              {/* Another Heading */}
              <div className="h-8 bg-stone-200 rounded w-2/3 mt-8"></div>
              
              <div className="space-y-3">
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-10/12"></div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Author Bio Skeleton */}
      <section className="py-8 border-t border-stone-200">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-2xl p-5 md:p-8 animate-pulse">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-stone-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-stone-200 rounded w-32"></div>
                <div className="h-4 bg-stone-200 rounded w-full"></div>
                <div className="h-4 bg-stone-200 rounded w-5/6"></div>
                <div className="h-10 bg-stone-200 rounded w-40 mt-4"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactions Skeleton (Likes & Comments) */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="h-48 bg-stone-100 rounded-lg animate-pulse"></div>
        </div>
      </section>

      {/* Related Articles Skeleton */}
      <section className="py-8 md:py-16 bg-stone-50">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="h-6 md:h-8 bg-stone-200 rounded w-48 mb-4 md:mb-8 animate-pulse"></div>
          <div className="space-y-3 md:space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-stretch gap-3 md:gap-4 bg-white rounded-2xl p-2.5 md:p-4 shadow-sm border border-stone-100 animate-pulse">
                <div className="flex-1 min-w-0">
                  <div className="h-5 md:h-6 bg-stone-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 md:h-4 bg-stone-200 rounded w-full mb-1.5"></div>
                  <div className="h-3 md:h-4 bg-stone-200 rounded w-5/6"></div>
                </div>
                <div className="w-24 md:w-40 flex-shrink-0 min-h-[86px] md:min-h-[104px] bg-stone-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Skeleton */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-6 md:p-12 text-center animate-pulse">
            <div className="h-6 md:h-8 bg-amber-400 rounded w-48 md:w-64 mx-auto mb-3 md:mb-4"></div>
            <div className="h-4 bg-amber-400 rounded w-64 md:w-96 mx-auto mb-6 md:mb-8"></div>
            <div className="h-11 md:h-12 bg-amber-400 rounded-full w-40 mx-auto"></div>
          </div>
        </div>
      </section>
    </div>
  );
}

