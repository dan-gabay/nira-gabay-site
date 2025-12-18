export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-stone-50">
      {/* Breadcrumb Skeleton */}
      <div className="bg-stone-50 py-4 border-b border-stone-100">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="h-4 bg-stone-200 rounded w-64 animate-pulse"></div>
        </div>
      </div>

      {/* Header Skeleton */}
      <section className="py-12 bg-gradient-to-br from-stone-100 to-amber-50">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl animate-pulse">
          <div className="flex gap-2 mb-6">
            <div className="h-6 bg-stone-200 rounded-full w-20"></div>
            <div className="h-6 bg-stone-200 rounded-full w-24"></div>
          </div>
          
          <div className="h-12 bg-stone-200 rounded-lg w-full mb-6"></div>
          <div className="h-6 bg-stone-200 rounded-lg w-3/4 mb-6"></div>
          
          <div className="flex gap-6 pb-6 border-b border-stone-200">
            <div className="h-4 bg-stone-200 rounded w-32"></div>
            <div className="h-4 bg-stone-200 rounded w-24"></div>
            <div className="h-4 bg-stone-200 rounded w-20"></div>
          </div>
        </div>
      </section>

      {/* Content Skeleton */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Image Skeleton */}
          <div className="h-96 bg-stone-200 rounded-2xl mb-12 animate-pulse"></div>
          
          {/* Text Skeleton */}
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-stone-200 rounded w-full"></div>
            <div className="h-4 bg-stone-200 rounded w-full"></div>
            <div className="h-4 bg-stone-200 rounded w-3/4"></div>
            <div className="h-4 bg-stone-200 rounded w-full mt-8"></div>
            <div className="h-4 bg-stone-200 rounded w-full"></div>
            <div className="h-4 bg-stone-200 rounded w-5/6"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
