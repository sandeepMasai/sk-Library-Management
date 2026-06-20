import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CommunicationMessage, CommunicationStats } from '../api/libraryApi';
import { sendNotification } from '../api/libraryApi';

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
  onSent?: () => void;
};

export function AdminCommunicationPanel({ history, stats, loading, onSent }: AdminCommunicationPanelProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const latest = history[0];
  const readRate =
    stats && stats.totalSent > 0 ? Math.round((stats.read / stats.totalSent) * 100) : 0;

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) return;

    setSending(true);
    setError('');
    try {
      await sendNotification({
        title: trimmedTitle,
        message: trimmedMessage,
        targetType: 'all',
        category: 'general',
      });
      setTitle('');
      setMessage('');
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="admin-panel admin-card rounded-2xl p-4 sm:p-5">
      <h2 className="font-display text-base font-bold text-white">Communication Center</h2>
      <p className="mt-1 text-xs text-white/70">Broadcast announcements to all students</p>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row">
        <div className="lg:w-1/3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Recent messages</p>
          {loading ? (
            <div className="mt-2 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="admin-skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="admin-card mt-4 rounded-xl border border-dashed border-white/20 px-3 py-6 text-center">
              <span className="text-2xl" aria-hidden>
                📩
              </span>
              <p className="mt-2 text-sm font-medium text-white">No messages sent yet</p>
              <p className="mt-1 text-xs text-white/60">Use the form to send your first broadcast.</p>
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {history.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white/85"
                >
                  <p className="font-medium text-white">📢 {item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-white/60">{item.message}</p>
                  <p className="mt-1 text-[10px] text-white/50">{formatWhen(item.sentAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="admin-card rounded-2xl border border-white/15 bg-white/10 p-4">
            {latest ? (
              <div className="space-y-3">
                <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md border border-primary/40 bg-primary/30 px-3 py-2 text-sm text-white shadow-sm">
                  {latest.message || latest.title}
                </div>
                <p className="text-center text-[10px] text-white/60">
                  Sent to {latest.recipientCount ?? 0} students · {latest.readCount ?? 0} read
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-2xl" aria-hidden>
                  💬
                </span>
                <p className="mt-2 text-sm text-white/70">Preview appears after your first campaign.</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="admin-card space-y-3 rounded-2xl p-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Message title"
              className="focus-ring-brand w-full rounded-xl border border-white/20 bg-white/8 px-3 py-2 text-sm text-white placeholder:text-white/40"
              required
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write announcement for all students…"
              rows={3}
              className="focus-ring-brand w-full rounded-xl border border-white/20 bg-white/8 px-3 py-2 text-sm text-white placeholder:text-white/40"
              required
            />
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={sending}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
              <Link
                to="/download"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Image / PDF in app
              </Link>
            </div>
          </form>
        </div>
      </div>

      {stats ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Sent" value={stats.totalSent} />
          <Stat label="Delivered" value={stats.delivered} />
          <Stat label="Read" value={stats.read} />
          <Stat label="Read rate" value={`${readRate}%`} />
        </div>
      ) : null}
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
