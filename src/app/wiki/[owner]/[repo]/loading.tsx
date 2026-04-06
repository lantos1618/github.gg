export default function WikiLoading() {
  return (
    <div className="min-h-screen bg-white pt-12 pb-20">
      <div className="w-[90%] max-w-5xl mx-auto space-y-6">
        <div className="animate-pulse rounded-md bg-gray-200 h-8 w-56" />
        <div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />
        <div className="space-y-3 mt-8">
          <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
          <div className="animate-pulse rounded-md bg-gray-200 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
