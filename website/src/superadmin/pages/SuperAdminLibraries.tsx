import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import {
  canDeleteLibrary,
  deleteLibrary,
  fetchSuperAdminLibraries,
  setLibraryBlocked,
  type SuperAdminLibrary,
} from '../api/superadminApi';
import { SuperAdminPageTitle } from '../components/SuperAdminPageTitle';
import { SuperAdminPagination } from '../components/SuperAdminPagination';
import { SuperAdminTableScroll } from '../components/SuperAdminTableScroll';
import { SaasCard } from '../components/SaasCard';
import { SuperAdminFilterSelect } from '../components/SuperAdminFilterSelect';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

type PlanFilter = 'all' | 'pro' | 'free' | 'trial';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortFilter = 'name_asc' | 'name_desc' | 'created_desc';

function sortLibraries(items: SuperAdminLibrary[], sort: SortFilter): SuperAdminLibrary[] {
  if (sort === 'created_desc') return items;
  const dir = sort === 'name_desc' ? -1 : 1;
  return [...items].sort(
    (a, b) => dir * (a.name || '').localeCompare(b.name || '', 'en', { sensitivity: 'base', numeric: true })
  );
}

function SortHeader({
  label,
  active,
  direction,
  onToggle,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 font-semibold transition ${
        active ? 'text-emerald-200' : 'text-white/70 hover:text-white'
      }`}
    >
      {label}
      <span className="text-xs">{active ? (direction === 'asc' ? 'A→Z' : 'Z→A') : '↕'}</span>
    </button>
  );
}

export function SuperAdminLibraries() {
  const [libraries, setLibraries] = useState<SuperAdminLibrary[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortFilter>('name_asc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const requestId = useRef(0);
  const isFirstSearchEffect = useRef(true);

  useEffect(() => {
    if (isFirstSearchEffect.current) {
      isFirstSearchEffect.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (searchInput.trim() !== debouncedSearch) {
      setSearching(true);
    }
  }, [searchInput, debouncedSearch]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');

    fetchSuperAdminLibraries({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch,
      planKey: planFilter,
      status: statusFilter,
      sort,
    })
      .then((res) => {
        if (id !== requestId.current) return;
        const rows = debouncedSearch ? res.libraries : sortLibraries(res.libraries, sort);
        setLibraries(rows);
        setTotal(res.total);
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(e instanceof Error ? e.message : 'Failed to load libraries');
        setLibraries([]);
        setTotal(0);
      })
      .finally(() => {
        if (id !== requestId.current) return;
        setLoading(false);
        setSearching(false);
      });
  }, [page, debouncedSearch, planFilter, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyFilters = (next: {
    sort?: SortFilter;
    plan?: PlanFilter;
    status?: StatusFilter;
  }) => {
    setPage(1);
    if (next.sort) setSort(next.sort);
    if (next.plan) setPlanFilter(next.plan);
    if (next.status) setStatusFilter(next.status);
  };

  const toggleNameSort = () => {
    applyFilters({ sort: sort === 'name_asc' ? 'name_desc' : 'name_asc' });
  };

  const handleToggleBlock = async (lib: SuperAdminLibrary) => {
    const next = !lib.isActive;
    const label = next ? 'activate' : 'block';
    if (!window.confirm(`${next ? 'Activate' : 'Block'} "${lib.name}"?`)) return;
    setActionId(lib.id);
    try {
      const updated = await setLibraryBlocked(lib.id, next);
      setLibraries((rows) => rows.map((r) => (r.id === lib.id ? { ...r, isActive: updated.isActive } : r)));
    } catch (e) {
      alert(e instanceof Error ? e.message : `Failed to ${label} library`);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (lib: SuperAdminLibrary) => {
    if (
      !window.confirm(
        `Permanently delete "${lib.name}"?\n\nThis removes students, attendance, seats, and notifications for this library. This cannot be undone.`
      )
    ) {
      return;
    }
    setActionId(lib.id);
    try {
      await deleteLibrary(lib.id);
      setLibraries((rows) => rows.filter((r) => r.id !== lib.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete library');
    } finally {
      setActionId(null);
    }
  };

  const showEmpty = !loading && !searching && libraries.length === 0;
  const subtitle = debouncedSearch
    ? `${total} result${total === 1 ? '' : 's'} for “${debouncedSearch}”`
    : `${total} libraries on the platform`;

  return (
    <div className="page-pad">
      <SuperAdminPageTitle title="Libraries" subtitle={subtitle} />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Library name or owner (e.g. sandeep)"
            dark
          />
          {searching ? <p className="mt-1 text-xs text-white/50">Searching…</p> : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <SuperAdminFilterSelect
          label="Sort by Name"
          value={sort}
          onChange={(value) => applyFilters({ sort: value as SortFilter })}
          options={[
            { value: 'name_asc', label: 'Name A → Z' },
            { value: 'name_desc', label: 'Name Z → A' },
            { value: 'created_desc', label: 'Recently Added' },
          ]}
        />
        <SuperAdminFilterSelect
          label="Plan"
          value={planFilter}
          onChange={(value) => applyFilters({ plan: value as PlanFilter })}
          options={[
            { value: 'all', label: 'All Plans' },
            { value: 'pro', label: 'Pro' },
            { value: 'free', label: 'Free' },
            { value: 'trial', label: 'Trial' },
          ]}
        />
        <SuperAdminFilterSelect
          label="Status"
          value={statusFilter}
          onChange={(value) => applyFilters({ status: value as StatusFilter })}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Not Active' },
          ]}
        />
      </div>

      {error ? (
        <SaasCard error className="mt-6">
          <p className="text-sm text-red-200">{error}</p>
        </SaasCard>
      ) : null}

      {loading && libraries.length === 0 ? (
        <p className="mt-8 text-white/65">Loading…</p>
      ) : showEmpty ? (
        <SaasCard className="mt-6">
          <p className="text-sm text-white/65">
            {debouncedSearch
              ? `No libraries found for “${debouncedSearch}”. Try a shorter name or owner keyword.`
              : 'No libraries match your filters.'}
          </p>
        </SaasCard>
      ) : (
        <div className="mt-6">
          <SuperAdminTableScroll>
            <table>
              <thead>
                <tr>
                  <th>
                    <SortHeader
                      label="Library"
                      active={sort === 'name_asc' || sort === 'name_desc'}
                      direction={sort === 'name_desc' ? 'desc' : 'asc'}
                      onToggle={toggleNameSort}
                    />
                  </th>
                  <th>Code</th>
                  <th>Plan</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {libraries.map((lib) => {
                  const busy = actionId === lib.id;
                  const deletable = canDeleteLibrary({
                    plan: lib.plan,
                    subscriptionStatus: lib.subscriptionStatus,
                    planExpiryDate: lib.planExpiryDate,
                  });
                  return (
                  <tr key={lib.id}>
                    <td>
                      <Link to={`/superadmin/libraries/${lib.id}`} className="font-medium text-white hover:text-emerald-200">
                        {lib.name}
                      </Link>
                      <p className="text-xs text-white/55">{lib.ownerName}</p>
                    </td>
                    <td className="font-mono text-xs">{lib.libraryCode}</td>
                    <td className="capitalize">{lib.planName || lib.currentPlanKey || lib.plan || '—'}</td>
                    <td>{lib.studentCount ?? '—'}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          lib.isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'
                        }`}
                      >
                        {lib.isActive ? 'Active' : 'Not Active'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/superadmin/libraries/${lib.id}`}
                          className="text-xs font-semibold text-emerald-200 hover:underline"
                        >
                          Manage
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleToggleBlock(lib)}
                          className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                        >
                          {lib.isActive ? 'Block' : 'Unblock'}
                        </button>
                        <button
                          type="button"
                          disabled={busy || !deletable}
                          title={
                            deletable
                              ? 'Delete library and all tenant data'
                              : 'Only active PRO libraries (before expiry) can be deleted'
                          }
                          onClick={() => void handleDelete(lib)}
                          className="rounded-lg border border-red-400/35 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
