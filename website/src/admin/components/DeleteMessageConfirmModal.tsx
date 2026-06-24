import { useEffect } from 'react';
import type { CommunicationMessage } from '../api/libraryApi';

type DeleteMessageConfirmModalProps = {
  open: boolean;
  item: CommunicationMessage | null;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function displayPreview(item: CommunicationMessage): string {
  const text = String(item.message || '')
    .replace(/\n?\n?📎\s*PDF:\s*https?:\/\/\S+/i, '')
    .trim();
  if (text) return text;
  if (item.documentUrl) return 'PDF attachment';
  if (item.imageUrl) return 'Image attachment';
  return 'No message text';
}

export function DeleteMessageConfirmModal({
  open,
  item,
  busy = false,
  onConfirm,
  onClose,
}: DeleteMessageConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open || !item) return null;

  const preview = displayPreview(item);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-message-title"
        aria-describedby="delete-message-desc"
        className="admin-panel admin-card w-full max-w-md overflow-hidden rounded-2xl border border-rose-400/25 shadow-2xl shadow-rose-950/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-rose-400/20 bg-gradient-to-r from-rose-500/20 to-red-600/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/25 text-xl ring-1 ring-rose-400/30"
              aria-hidden
            >
              🗑️
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-200/80">Delete message</p>
              <h2 id="delete-message-title" className="mt-0.5 font-display text-lg font-bold text-white">
                Remove from all students?
              </h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p id="delete-message-desc" className="text-sm leading-relaxed text-white/75">
            This message will be deleted from student notifications and cannot be recovered.
          </p>

          <div className="rounded-xl border border-white/15 bg-white/8 p-3">
            <p className="text-sm font-semibold text-white">📢 {item.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-white/60">{preview}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-white/50">
              <span className="rounded-full bg-white/10 px-2 py-0.5">{item.audienceLabel || item.audience}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5">{item.recipientCount ?? 0} recipients</span>
              {item.readCount ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-200">
                  {item.readCount} read
                </span>
              ) : null}
              {item.documentUrl ? (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-100">PDF</span>
              ) : null}
              {item.imageUrl ? (
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-100">Image</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5">
            <span className="text-sm" aria-hidden>
              ⚠️
            </span>
            <p className="text-xs font-medium leading-relaxed text-amber-100">
              Students who already read this message will no longer see it in their inbox.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-white/5 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/30 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Deleting…' : 'Yes, delete message'}
          </button>
        </div>
      </div>
    </div>
  );
}
