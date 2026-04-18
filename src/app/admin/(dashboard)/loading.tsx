export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-muted" />
          <div className="h-4 w-72 rounded bg-muted" />
        </div>
        <div className="h-9 w-28 rounded bg-muted" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="rounded-lg border bg-card">
        {/* Table header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b">
          <div className="h-9 w-64 rounded bg-muted" />
          <div className="h-9 w-32 rounded bg-muted" />
        </div>
        {/* Table rows */}
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="h-4 w-[150px] rounded bg-muted" />
              <div className="h-4 w-[200px] rounded bg-muted" />
              <div className="h-4 w-[100px] rounded bg-muted" />
              <div className="h-4 w-[60px] rounded bg-muted" />
              <div className="h-4 w-[80px] rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
