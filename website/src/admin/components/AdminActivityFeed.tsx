type FeedItem = {
  id: string;
  title: string;
  message?: string;
  time?: string;
  icon?: string;
  unread?: boolean;
  kind?: 'incoming' | 'sent' | 'alert';
};

type AdminActivityFeedProps = {
  items: FeedItem[];
  loading?: boolean;
  id?: string;
  limit?: number;
  onItemClick?: (item: FeedItem) => void;
};

const DEFAULT_LIMIT = 5;

export function AdminActivityFeed({ items, loading, id, limit = DEFAULT_LIMIT, onItemClick }: AdminActivityFeedProps) {
  const visibleItems = items.slice(0, limit);
  return (
    <section
      id={id}
      className="admin-panel admin-card h-full rounded-2xl p-4 sm:p-5"
    >
      <h2 className="font-display text-base font-bold text-white">Notification Center</h2>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: DEFAULT_LIMIT }).map((_, i) => (
            <div key={i} className="admin-skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No recent activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visibleItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onItemClick?.(item)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  item.unread
                    ? 'border-red-300/50 bg-red-500/15 hover:bg-red-500/20'
                    : item.kind === 'alert'
                      ? 'border-amber-300/50 bg-amber-500/10 hover:bg-amber-500/15'
                      : 'border-white/15 bg-white/10 hover:bg-white/15'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                    item.unread ? 'bg-red-500/20' : item.kind === 'alert' ? 'bg-amber-500/20' : 'bg-white/10'
                  }`}
                >
                  {item.icon || '🔔'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${item.unread ? 'text-rose-200' : 'text-white'}`}>
                      {item.title}
                    </p>
                    {item.unread ? (
                      <span className="shrink-0 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                  {item.message ? <p className="mt-0.5 text-xs text-white/70">{item.message}</p> : null}
                  {item.time ? <p className="text-xs text-white/50">{item.time}</p> : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
