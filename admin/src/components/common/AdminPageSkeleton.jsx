export default function AdminPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header bar skeleton */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-gray-100 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 rounded-md" />
          <div className="h-3.5 w-72 bg-gray-100 rounded-md" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-md" />
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white/80 rounded-xl border border-gray-100 p-5 space-y-3">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-7 w-16 bg-gray-300 rounded" />
            <div className="h-3 w-28 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table Skeleton */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="h-9 w-72 bg-gray-100 rounded-lg" />
          <div className="h-9 w-32 bg-gray-100 rounded-lg" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 px-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-56 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
              <div className="h-8 w-24 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
