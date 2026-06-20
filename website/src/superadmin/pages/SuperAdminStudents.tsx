import { useEffect, useState } from 'react';
import { apiRaw } from '../../lib/http';
import { SuperAdminPageTitle } from '../components/SuperAdminPageTitle';
import { SuperAdminPagination } from '../components/SuperAdminPagination';
import { SuperAdminTableScroll } from '../components/SuperAdminTableScroll';
import { SaasCard } from '../components/SaasCard';

type AdminStudent = {
  id: string;
  name?: string;
  mobile?: string;
  feeStatus?: string;
  library?: { name?: string; id?: string } | null;
};

const PAGE_SIZE = 10;

export function SuperAdminStudents() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiRaw<{ ok?: boolean; students?: AdminStudent[]; total?: number }>(
      `/api/admin/students?page=${page}&limit=${PAGE_SIZE}`
    )
      .then((res) => {
        setStudents(res.students ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load students'))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page-pad">
      <SuperAdminPageTitle title="Students" subtitle={`${total} students across all libraries`} />

      {error ? (
        <SaasCard error className="mt-6">
          <p className="text-sm text-red-200">{error}</p>
        </SaasCard>
      ) : null}

      {loading ? (
        <p className="mt-8 text-white/65">Loading…</p>
      ) : (
        <div className="mt-6">
          <SuperAdminTableScroll>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Library</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.name || '—'}</td>
                    <td>{s.mobile || '—'}</td>
                    <td>{s.library?.name || '—'}</td>
                    <td className="capitalize">{s.feeStatus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SuperAdminTableScroll>
        </div>
      )}

      {totalPages > 1 ? (
        <SuperAdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      ) : null}
    </div>
  );
}
