import { Link } from 'react-router-dom';
import type { CommunicationMessage, CommunicationStats } from '../api/libraryApi';

function formatWhen(iso?: string | null) {
  if (!iso) return 'Recently';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return 'Recently';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

type AdminCommunicationPanelProps = {
  history: CommunicationMessage[];
  stats: CommunicationStats | null;
  loading?: boolean;
};

export function AdminCommunicationPanel({ history, stats, loading }: AdminCommunicationPanelProps) {
  const readRate =
    stats && stats.totalSent > 0 ? Math.round((stats.read / stats.totalSent) * 100) : 0;

  return (
    <section className="admin-panel admin-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-white">Communication Center</h2>
          <p className="mt-1 text-xs text-white/70">Send text, images & PDF to students</p>
        </div>
        <Link
          to="/admin/communications"
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
        >
          Open center →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sent" value={stats?.totalSent ?? 0} />
        <Stat label="Delivered" value={stats?.delivered ?? 0} />
        <Stat label="Read" value={stats?.read ?? 0} />
        <Stat label="Read rate" value={`${readRate}%`} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Recent messages</p>
        {loading ? (
          <div className="mt-2 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="admin-skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="admin-card mt-3 rounded-xl border border-dashed border-white/20 px-3 py-6 text-center">
            <p className="text-sm font-medium text-white">No messages sent yet</p>
            <Link to="/admin/communications" className="mt-2 inline-block text-xs font-semibold text-primary">
              Send your first message →
            </Link>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.slice(0, 4).map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white/85"
              >
                <p className="font-medium text-white">📢 {item.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-white/60">{item.message}</p>
                <p className="mt-1 text-[10px] text-white/50">
                  {item.recipientCount ?? 0} sent · {item.readCount ?? 0} read · {formatWhen(item.sentAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
