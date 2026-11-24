export default function DataTableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="w-full bg-white rounded-md border border-gray-100 overflow-hidden animate-pulse">
      {/* Table Header Skeleton */}
      <div className="h-11 bg-gray-50 border-b border-gray-200/80 flex items-center px-6 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`th-${i}`}
            className="h-3.5 bg-gray-200 rounded-sm"
            style={{ width: `${Math.max(12, 100 / columns - 5)}%` }}
          />
        ))}
      </div>

      {/* Table Body Rows Skeleton */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`tr-${rIdx}`} className="h-16 px-6 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={`td-${rIdx}-${cIdx}`}
                className="h-4 bg-gray-100 rounded-sm"
                style={{
                  width: cIdx === 0 ? '30%' : `${Math.max(10, 80 / columns)}%`,
                  opacity: 1 - rIdx * 0.1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
