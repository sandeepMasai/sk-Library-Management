import type { LiveFeedItem } from '../../utils/attendanceHelpers';

type AttendanceLiveFeedProps = {
  items: LiveFeedItem[];
  loading?: boolean;
  autoRefresh?: boolean;
};

export function AttendanceLiveFeed({ items, loading, autoRefresh }: AttendanceLiveFeedProps) {
  return (
    <div className="attendance-live-feed admin-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Live attendance monitor</h2>
          <p className="text-xs text-muted">Real-time activity feed</p>
        </div>
        {autoRefresh ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Auto refresh
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-12 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 py-8 text-center text-sm text-muted">No activity yet today.</p>
      ) : (
        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm ${
                item.type === 'blocked' ? 'bg-rose-50/80' : 'bg-slate-50/80'
              }`}
            >
              <span className="shrink-0 font-mono text-xs text-muted">{item.time}</span>
              <span className={item.type === 'blocked' ? 'text-rose-800' : 'text-slate-800'}>
                {item.type === 'checkin' ? '✅' : '❌'} {item.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
