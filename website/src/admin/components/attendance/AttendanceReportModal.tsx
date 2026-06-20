import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { exportAttendanceCsv } from '../../utils/attendanceHelpers';
import type { EnrichedAttendanceRow } from '../../utils/attendanceHelpers';

type AttendanceReportModalProps = {
  open: boolean;
  rows: EnrichedAttendanceRow[];
  dateFrom: string;
  dateTo: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  onClose: () => void;
  onReportTypeChange: (t: 'daily' | 'weekly' | 'monthly' | 'custom') => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
};

export function AttendanceReportModal({
  open,
  rows,
  dateFrom,
  dateTo,
  reportType,
  onClose,
  onReportTypeChange,
  onDateFromChange,
  onDateToChange,
}: AttendanceReportModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <GlassCard admin padding="md" className="w-full max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Reports</p>
            <h2 className="font-display text-xl font-bold text-slate-900">Generate report</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['daily', 'weekly', 'monthly', 'custom'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onReportTypeChange(t)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium capitalize ${
                reportType === t ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {reportType === 'custom' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="focus-ring-brand mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="focus-ring-brand mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-sm text-muted">{rows.length} records in current view</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => exportAttendanceCsv(rows, dateFrom)}>Export Excel</Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
          >
            Export PDF
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
