export function AdminDashboardSkeleton() {
  return (
    <div className="page-pad admin-dashboard-pad animate-pulse space-y-6">
      <div className="admin-skeleton h-24 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-20 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-skeleton h-64 rounded-2xl" />
        <div className="admin-skeleton h-64 rounded-2xl" />
      </div>
      <div className="admin-skeleton h-72 rounded-2xl" />
    </div>
  );
}
