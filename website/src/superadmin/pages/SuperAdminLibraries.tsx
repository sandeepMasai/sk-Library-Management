import { useEffect, useState } from 'react';
import { Input } from '../../components/ui/Input';
import { fetchSuperAdminLibraries, type SuperAdminLibrary } from '../api/superadminApi';

export function SuperAdminLibraries() {
  const [libraries, setLibraries] = useState<SuperAdminLibrary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchSuperAdminLibraries({ page, limit: 20, search: query })
      .then((res) => {
        setLibraries(res.libraries);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load libraries'))
      .finally(() => setLoading(false));
  }, [page, query]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Libraries</h1>
      <p className="mt-1 text-sm text-muted">{total} libraries on the platform</p>

      <form
        className="mt-6 flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, owner, or library code"
          />
        </div>
        <button
          type="submit"
          className="self-end rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-muted">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Library</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {libraries.map((lib) => (
                <tr key={lib.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{lib.name}</p>
                    <p className="text-xs text-muted">{lib.ownerName}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{lib.libraryCode}</td>
                  <td className="px-4 py-3 capitalize">{lib.currentPlanKey || lib.plan || '—'}</td>
                  <td className="px-4 py-3">{lib.studentCount ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        lib.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {lib.isActive ? 'Active' : 'Blocked'}
                    </span>
                  </td>
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
