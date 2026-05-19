import { useEffect, useState } from 'react';
import { apiRaw } from '../../lib/http';

type AdminStudent = {
  id: string;
  name?: string;
  mobile?: string;
  feeStatus?: string;
  library?: { name?: string; id?: string } | null;
};

export function SuperAdminStudents() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiRaw<{ ok?: boolean; students?: AdminStudent[]; total?: number }>(
      `/api/admin/students?page=${page}&limit=20`
    )
      .then((res) => {
        setStudents(res.students ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load students'))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="page-pad">
      <h1 className="text-2xl font-bold text-slate-900">Students</h1>
      <p className="mt-1 text-sm text-muted">{total} students across all libraries</p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-muted">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Library</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name || '—'}</td>
                  <td className="px-4 py-3">{s.mobile || '—'}</td>
                  <td className="px-4 py-3">{s.library?.name || '—'}</td>
                  <td className="px-4 py-3 capitalize">{s.feeStatus || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
