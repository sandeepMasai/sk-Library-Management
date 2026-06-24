import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminPageHeader } from '../components/AdminPageHeader';
import {
  fetchCommunicationHistory,
  fetchCommunicationStats,
  fetchStudents,
  previewCommunicationRecipientCount,
  sendCommunicationMessage,
  updateCommunicationMessage,
  deleteCommunicationMessage,
  type CommunicationAudience,
  type CommunicationMessage,
  type CommunicationStats,
  type StudentRow,
} from '../api/libraryApi';
import { deriveCommunicationTitle } from '../utils/communicationMessage';
import { getStudentStatus } from '../utils/studentHelpers';
import { DeleteMessageConfirmModal } from '../components/DeleteMessageConfirmModal';

const QUICK_ACTIONS = [
  {
    id: 'fee',
    label: 'Fee reminder',
    message: 'Dear student, please renew your library membership fee at the earliest to continue uninterrupted access.',
  },
  {
    id: 'expiry',
    label: 'Expiry alert',
    message: 'Your library membership is expiring soon. Please visit the library desk or renew through the app.',
  },
  {
    id: 'exam',
    label: 'Exam notice',
    message: 'Best of luck for your upcoming exams. Please check library notices for updated timings.',
  },
] as const;

function formatWhen(iso?: string | null) {
  if (!iso) return 'Recently';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function stripPdfLine(text: string): string {
  return String(text || '')
    .replace(/\n?\n?📎\s*PDF:\s*https?:\/\/\S+/i, '')
    .trim();
}

function displayMessageBody(item: CommunicationMessage): string {
  if (item.documentUrl) return stripPdfLine(item.message);
  return item.message || '';
}

export function AdminCommunication() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [history, setHistory] = useState<CommunicationMessage[]>([]);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [listTab, setListTab] = useState<'students' | 'sent'>('students');
  const [search, setSearch] = useState('');
  const [audience, setAudience] = useState<CommunicationAudience>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [recipientCount, setRecipientCount] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommunicationMessage | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studentRows, hist, st] = await Promise.all([
        fetchStudents(),
        fetchCommunicationHistory(50),
        fetchCommunicationStats(),
      ]);
      setStudents(studentRows);
      setHistory(hist);
      setStats(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load communication data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (audience === 'selected' && selectedIds.length === 0) {
        setRecipientCount(0);
        return;
      }
      try {
        const count = await previewCommunicationRecipientCount({
          audience,
          studentIds: audience === 'selected' ? selectedIds : undefined,
        });
        if (!cancelled) setRecipientCount(count);
      } catch {
        if (!cancelled) setRecipientCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audience, selectedIds]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (audience === 'active' && getStudentStatus(s) !== 'active') return false;
      if (audience === 'expired' && getStudentStatus(s) !== 'expired') return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.mobile.includes(q) ||
        s.username.toLowerCase().includes(q)
      );
    });
  }, [students, search, audience]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) => h.title.toLowerCase().includes(q) || (h.message || '').toLowerCase().includes(q)
    );
  }, [history, search]);

  const readRate =
    stats && stats.totalSent > 0 ? Math.round((stats.read / stats.totalSent) * 100) : 0;

  const hasContent = Boolean(message.trim() || attachment);

  const canSend = useMemo(() => {
    if (sending || !hasContent) return false;
    if (audience === 'selected') return selectedIds.length > 0;
    return recipientCount > 0;
  }, [sending, hasContent, audience, selectedIds.length, recipientCount]);

  const sendDisabledReason = useMemo(() => {
    if (sending) return 'Sending…';
    if (!hasContent) return 'Add a message or attach a file';
    if (audience === 'selected' && selectedIds.length === 0) {
      return 'Select at least one student';
    }
    if (recipientCount === 0) return 'No students match this audience';
    return '';
  }, [sending, hasContent, audience, selectedIds.length, recipientCount]);

  function toggleStudent(id: string) {
    if (audience !== 'selected') return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onPickFile(file: File | null) {
    if (!file) return;
    setAttachment(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setAttachmentPreview(url);
    } else {
      setAttachmentPreview(null);
    }
  }

  function clearAttachment() {
    setAttachment(null);
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(null);
  }

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed && !attachment) {
      setError('Add a message or attach an image/PDF.');
      return;
    }
    if (audience === 'selected' && selectedIds.length === 0) {
      setError('Select at least one student.');
      return;
    }

    const hasImage = Boolean(attachment && attachment.type.startsWith('image/'));
    const isPdf = Boolean(
      attachment &&
        (attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf'))
    );
    const messageType = isPdf && trimmed
      ? 'text_pdf'
      : isPdf
        ? 'pdf'
        : hasImage && trimmed
          ? 'text_image'
          : hasImage
            ? 'image'
            : 'text';
    const title = deriveCommunicationTitle(trimmed, Boolean(attachment)) || 'Message from library';

    setSending(true);
    setError('');
    setSuccess('');
    try {
      const result = await sendCommunicationMessage({
        title,
        message: trimmed,
        messageType,
        audience,
        studentIds: audience === 'selected' ? selectedIds : undefined,
        attachment,
      });
      setMessage('');
      clearAttachment();
      setSelectedIds([]);
      setAudience('all');
      setSuccess(`Sent to ${result.recipientCount ?? 0} student(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function startEdit(item: CommunicationMessage) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditMessage(displayMessageBody(item));
    setError('');
    setSuccess('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditMessage('');
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const title = editTitle.trim();
    const body = editMessage.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }
    const editingItem = history.find((h) => h.id === editingId);
    if (!body && !editingItem?.imageUrl && !editingItem?.documentUrl) {
      setError('Message text is required.');
      return;
    }

    setSavingEdit(true);
    setError('');
    setSuccess('');
    try {
      await updateCommunicationMessage(editingId, { title, message: body });
      setSuccess('Message updated.');
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update message');
    } finally {
      setSavingEdit(false);
    }
  }

  function requestDelete(item: CommunicationMessage) {
    setDeleteTarget(item);
    setError('');
    setSuccess('');
  }

  function cancelDelete() {
    if (deletingId) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    setError('');
    setSuccess('');
    try {
      await deleteCommunicationMessage(deleteTarget.id);
      if (editingId === deleteTarget.id) cancelEdit();
      setSuccess('Message deleted.');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete message');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-dashboard-pad page-pad">
      <AdminPageHeader
        title="Communication Center"
        subtitle="Send text, images, and PDFs to students. Stats sync from the communications API."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
          >
            Refresh
          </button>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
          {success}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sent" value={stats?.totalSent ?? 0} />
        <StatCard label="Delivered" value={stats?.delivered ?? 0} accent="text-sky-200" />
        <StatCard label="Read" value={stats?.read ?? 0} accent="text-emerald-200" />
        <StatCard label="Read rate" value={`${readRate}%`} accent="text-amber-200" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <section className="admin-panel admin-card rounded-2xl p-4 sm:p-5 xl:col-span-2">
          <div className="flex gap-2">
            {(['students', 'sent'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setListTab(tab)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  listTab === tab
                    ? 'bg-white/15 text-white ring-1 ring-white/25'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {tab === 'students' ? 'Students' : 'Sent'}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={listTab === 'students' ? 'Search students…' : 'Search messages…'}
            className="focus-ring-brand mt-3 w-full rounded-xl border border-white/20 bg-white/8 px-3 py-2 text-sm text-white placeholder:text-white/40"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ['all', 'All students'],
                ['active', 'Active only'],
                ['expired', 'Expired only'],
                ['selected', 'Individual'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setAudience(key);
                  if (key !== 'selected') setSelectedIds([]);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  audience === key
                    ? 'bg-primary/30 text-white ring-1 ring-primary/50'
                    : 'bg-white/8 text-white/70 hover:bg-white/12'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {audience === 'selected' ? (
            <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Individual mode — tick students below. Send stays disabled until at least one is selected.
            </p>
          ) : (
            <p className="mt-2 text-xs text-white/55">
              Message will go to all students in this group. Switch to Individual to pick specific students.
            </p>
          )}

          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <p className="py-8 text-center text-sm text-white/60">Loading…</p>
            ) : listTab === 'students' ? (
              filteredStudents.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/60">No students found.</p>
              ) : (
                filteredStudents.map((s) => {
                  const checked = selectedIds.includes(s.id);
                  const status = getStudentStatus(s);
                  const isIndividual = audience === 'selected';
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudent(s.id)}
                      disabled={!isIndividual}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        isIndividual
                          ? checked
                            ? 'border-primary/40 bg-primary/15'
                            : 'border-white/15 bg-white/8 hover:bg-white/12'
                          : 'cursor-default border-white/10 bg-white/5 opacity-90'
                      }`}
                    >
                      {isIndividual ? (
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                            checked ? 'border-primary bg-primary text-white' : 'border-white/30'
                          }`}
                        >
                          {checked ? '✓' : ''}
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50">
                          •
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{s.name}</span>
                        <span className="block text-xs text-white/55">
                          {s.mobile} · {status === 'active' ? 'Active' : 'Expired'}
                        </span>
                      </span>
                    </button>
                  );
                })
              )
            ) : filteredHistory.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/60">No messages sent yet.</p>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/15 bg-white/8 px-3 py-2.5"
                >
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="focus-ring-brand w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                        placeholder="Title"
                      />
                      <textarea
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                        rows={4}
                        className="focus-ring-brand w-full resize-y rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                        placeholder="Message text"
                      />
                      {item.documentUrl ? (
                        <p className="text-[10px] text-white/50">PDF attachment will stay linked.</p>
                      ) : null}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="max-h-20 rounded-lg border border-white/10 object-cover"
                        />
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={() => void handleSaveEdit()}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {savingEdit ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white">📢 {item.title}</p>
                      {displayMessageBody(item) ? (
                        <p className="mt-1 line-clamp-2 text-xs text-white/60">{displayMessageBody(item)}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-white/45">
                        {item.audienceLabel} · {item.recipientCount ?? 0} sent · {item.readCount ?? 0} read ·{' '}
                        {formatWhen(item.sentAt)}
                      </p>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="mt-2 max-h-24 rounded-lg border border-white/10 object-cover"
                        />
                      ) : null}
                      {item.documentUrl ? (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-100">
                          📄 PDF attached
                        </p>
                      ) : null}
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-white/15"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => requestDelete(item)}
                          className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-2.5 py-1 text-[10px] font-bold text-rose-100 hover:bg-rose-500/25 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="admin-panel admin-card rounded-2xl p-4 sm:p-5 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Compose message</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setMessage(a.message)}
                className="rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/12"
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm text-white/80">
            Recipients: <strong className="text-white">{recipientCount}</strong>
            {audience === 'selected' ? (
              <span className={selectedIds.length === 0 ? ' text-amber-200' : ''}>
                {' '}
                · {selectedIds.length} selected
                {selectedIds.length === 0 ? ' (required)' : ''}
              </span>
            ) : null}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message… Use {student_name}, {library_name}, {due_date}, {amount} for personalization."
            rows={6}
            className="focus-ring-brand mt-4 w-full resize-y rounded-xl border border-white/20 bg-white/8 px-3 py-2.5 text-sm text-white placeholder:text-white/40"
          />

          {attachment ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 p-3">
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <span className="text-2xl" aria-hidden>
                  📄
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{attachment.name}</p>
                <p className="text-xs text-white/55">
                  {(attachment.size / 1024).toFixed(0)} KB ·{' '}
                  {attachment.type === 'application/pdf' ? 'PDF' : 'Image'}
                </p>
              </div>
              <button
                type="button"
                onClick={clearAttachment}
                className="rounded-lg border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                Remove
              </button>
            </div>
          ) : null}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
            >
              🖼 Attach image
            </button>
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
            >
              📄 Attach PDF
            </button>
            <button
              type="button"
              disabled={!canSend}
              title={sendDisabledReason}
              onClick={() => void handleSend()}
              className="ml-auto rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </div>
          {!canSend && sendDisabledReason ? (
            <p className="mt-2 text-right text-xs text-white/55">{sendDisabledReason}</p>
          ) : null}
        </section>
      </div>

      <DeleteMessageConfirmModal
        open={Boolean(deleteTarget)}
        item={deleteTarget}
        busy={Boolean(deletingId)}
        onClose={cancelDelete}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = 'text-white',
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="admin-panel admin-card rounded-2xl px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
