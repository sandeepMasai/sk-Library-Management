import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { sendNotification } from '../../api/libraryApi';

type StudentMessageModalProps = {
  open: boolean;
  studentIds: string[];
  studentNames: string[];
  onClose: () => void;
};

export function StudentMessageModal({ open, studentIds, studentNames, onClose }: StudentMessageModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const isBulk = studentIds.length > 1;
  const label = isBulk ? `${studentIds.length} students` : studentNames[0] || 'Student';

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      if (isBulk) {
        await sendNotification({
          title: title.trim(),
          message: message.trim(),
          targetType: 'all',
          category: 'announcement',
        });
      } else {
        await sendNotification({
          title: title.trim(),
          message: message.trim(),
          targetType: 'student',
          targetId: studentIds[0],
          category: 'announcement',
        });
      }
      setSuccess('Message sent successfully.');
      setTitle('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <GlassCard admin padding="md" className="w-full max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Communication</p>
            <h2 className="font-display text-xl font-bold text-slate-900">Send message</h2>
            <p className="mt-1 text-sm text-muted">To: {label}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted">
            ✕
          </button>
        </div>

        <form onSubmit={handleSend} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="focus-ring-brand w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              placeholder="Fee reminder"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="focus-ring-brand w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              placeholder="Your membership expires soon…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTitle('Fee reminder');
                setMessage('Please clear your pending library fee at the earliest.');
              }}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
            >
              Fee reminder
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle('Membership expiry alert');
                setMessage('Your membership is expiring soon. Please renew to continue access.');
              }}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
            >
              Expiry reminder
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={sending} className="flex-1">
              {sending ? 'Sending…' : 'Send message'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
