import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { fetchAttendanceByDate, generateQrToken } from '../api/libraryApi';

const qrUrl = (token: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(token)}`;

export function AdminAttendance() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [list, setList] = useState<{ studentName?: string; studentId: string; checkInTime?: string }[]>([]);
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadList = () => {
    fetchAttendanceByDate(date)
      .then((rows) => setList(rows as typeof list))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  };

  useEffect(() => {
    loadList();
  }, [date]);

  async function loadQr(rotate = false) {
    setLoading(true);
    setError('');
    try {
      const res = await generateQrToken(rotate);
      setToken(res.token);
      setExpiresAt(res.expiresAt);
      if (res.locked && res.message) setError(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load QR');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQr(false);
  }, []);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
      <p className="mt-1 text-sm text-muted">Display QR for students to scan in the mobile app.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {token ? (
            <img src={qrUrl(token)} alt="Attendance QR" className="mx-auto rounded-xl" />
          ) : (
            <p className="py-20 text-muted">No QR token</p>
          )}
          {expiresAt ? (
            <p className="mt-4 text-xs text-muted">Valid until {new Date(expiresAt).toLocaleString()}</p>
          ) : null}
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" disabled={loading} onClick={() => loadQr(false)}>
              Refresh QR
            </Button>
            <Button disabled={loading} onClick={() => loadQr(true)}>
              Rotate QR
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm text-amber-700">{error}</p> : null}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
          />
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <p className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">
              Check-ins ({list.length})
            </p>
            <ul className="max-h-96 divide-y divide-slate-50 overflow-auto">
              {list.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-muted">No attendance for this date</li>
              ) : (
                list.map((row, i) => (
                  <li key={`${row.studentId}-${i}`} className="flex justify-between px-4 py-3 text-sm">
                    <span>{row.studentName || row.studentId}</span>
                    <span className="text-muted">{row.checkInTime || '—'}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
