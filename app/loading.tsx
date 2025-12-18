export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-amber-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-stone-300 border-t-amber-600 mb-4"></div>
        <p className="text-stone-600 text-lg">טוען...</p>
      </div>
    </div>
  );
}
