export default function ArticlesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-stone-50 py-16">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        {/* Header Skeleton */}
        <div className="mb-12 animate-pulse">
          <div className="h-12 bg-stone-200 rounded-lg w-64 mb-4"></div>
          <div className="h-6 bg-stone-200 rounded-lg w-96"></div>
        </div>

        {/* Search Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-12 bg-stone-200 rounded-lg w-full max-w-md"></div>
        </div>

        {/* Articles Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-stone-100 animate-pulse">
              <div className="h-48 bg-stone-200"></div>
              <div className="p-6">
                <div className="h-4 bg-stone-200 rounded w-20 mb-3"></div>
                <div className="h-6 bg-stone-200 rounded w-full mb-3"></div>
                <div className="h-4 bg-stone-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-stone-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
