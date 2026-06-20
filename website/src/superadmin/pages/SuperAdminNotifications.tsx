import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { SuperAdminFilterSelect } from '../components/SuperAdminFilterSelect';
import { SuperAdminPageTitle } from '../components/SuperAdminPageTitle';
import { SaasCard } from '../components/SaasCard';
import {
  deleteSuperAdminNotification,
  fetchSuperAdminLibraries,
  fetchSuperAdminNotifications,
  sendSuperAdminNotification,
  updateSuperAdminNotification,
  type SuperAdminLibrary,
  type SuperAdminNotification,
} from '../api/superadminApi';

function formatRelativeTime(iso?: string | null) {
  if (!iso) return 'Recently';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return 'Recently';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function targetLabel(target: string, libraries: SuperAdminLibrary[]) {
  if (target === 'all') return 'All libraries';
  const lib = libraries.find((l) => l.id === target);
  return lib?.name || 'Single library';
}

export function SuperAdminNotifications() {
  const [notifications, setNotifications] = useState<SuperAdminNotification[]>([]);
  const [libraries, setLibraries] = useState<SuperAdminLibrary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');

  const loadNotifications = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchSuperAdminNotifications(50),
      fetchSuperAdminLibraries({ limit: 200, sort: 'name_asc' }),
    ])
      .then(([rows, libRes]) => {
        setNotifications(rows);
        setLibraries(libRes.libraries);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) return;

    setSending(true);
    setError('');
    try {
      await sendSuperAdminNotification({
        title: trimmedTitle,
        message: trimmedMessage,
        target: target || 'all',
      });
      setTitle('');
      setMessage('');
      setTarget('all');
      loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  function startEdit(row: SuperAdminNotification) {
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditMessage(row.message);
  }

  async function saveEdit() {
    if (!editingId) return;
    const trimmedTitle = editTitle.trim();
    const trimmedMessage = editMessage.trim();
    if (!trimmedTitle || !trimmedMessage) return;

    try {
      await updateSuperAdminNotification(editingId, { title: trimmedTitle, message: trimmedMessage });
      setEditingId(null);
      loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await deleteSuperAdminNotification(id);
      if (editingId === id) setEditingId(null);
      loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  }

  const libraryOptions = [
    { value: 'all', label: 'All libraries' },
    ...libraries.map((lib) => ({ value: lib.id, label: lib.name || lib.id })),
  ];

  return (
    <div className="page-pad">
      <SuperAdminPageTitle
        title="Library Messages"
        subtitle="Send platform alerts to library owners — not student notifications"
      />

      {error ? (
        <SaasCard error className="mt-6">
          <p className="text-sm text-red-200">{error}</p>
        </SaasCard>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <SaasCard>
          <h2 className="font-display text-base font-bold text-white">Message library owners</h2>
          <p className="mt-1 text-xs text-white/55">Delivered to library dashboards only — students will not see these.</p>
          <form className="mt-4 space-y-4" onSubmit={handleSend}>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-white/60">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="focus-ring-brand mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40"
                placeholder="Maintenance update"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-white/60">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="focus-ring-brand mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40"
                placeholder="Write your message for library owners…"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-white/60">Target</span>
              <div className="mt-1.5">
                <SuperAdminFilterSelect
                  label="Send to"
                  value={target}
                  onChange={setTarget}
                  options={libraryOptions}
                />
              </div>
            </label>
            <Button type="submit" fullWidth disabled={sending}>
              {sending ? 'Sending…' : 'Send to libraries'}
            </Button>
          </form>
        </SaasCard>

        <SaasCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-white">Sent to libraries</h2>
            <span className="text-xs text-white/60">{notifications.length} total</span>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-white/65">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="mt-6 text-sm text-white/60">No admin messages sent to libraries yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {notifications.map((row) => (
                <li key={row.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  {editingId === row.id ? (
                    <div className="space-y-3">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="focus-ring-brand w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
                      />
                      <textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={3}
                        className="focus-ring-brand w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
                      />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={saveEdit}>
                          Save
                        </Button>
                        <Button type="button" size="sm" variant="ghost-dark" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-white">{row.title}</p>
                          <p className="mt-1 text-sm text-white/75">{row.message}</p>
                        </div>
                        <span className="shrink-0 text-lg" aria-hidden>
                          🔔
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span className="rounded-full bg-white/10 px-2 py-0.5">
                          {targetLabel(row.target, libraries)}
                        </span>
                        {row.count && row.count > 1 ? (
                          <span className="rounded-full bg-white/10 px-2 py-0.5">{row.count} libraries</span>
                        ) : null}
                        <span>{formatRelativeTime(row.createdAt)}</span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="rounded-lg border border-red-400/30 px-2.5 py-1 text-xs text-red-200 transition hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SaasCard>
      </div>
    </div>
  );
}
