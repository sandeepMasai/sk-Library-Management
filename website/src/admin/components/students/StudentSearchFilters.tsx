import type { AdvancedFilters } from '../../utils/studentHelpers';
import { DEFAULT_ADVANCED_FILTERS } from '../../utils/studentHelpers';

type StudentSearchFiltersProps = {
  search: string;
  searchField: 'all' | 'name' | 'phone' | 'email' | 'id' | 'seat';
  filters: AdvancedFilters;
  showFilters: boolean;
  onSearchChange: (v: string) => void;
  onSearchFieldChange: (v: StudentSearchFiltersProps['searchField']) => void;
  onFiltersChange: (v: AdvancedFilters) => void;
  onToggleFilters: () => void;
  onResetFilters: () => void;
};

function FilterCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/10">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="admin-checkbox focus:ring-primary/30"
      />
      {label}
    </label>
  );
}

export function StudentSearchFilters({
  search,
  searchField,
  filters,
  showFilters,
  onSearchChange,
  onSearchFieldChange,
  onFiltersChange,
  onToggleFilters,
  onResetFilters,
}: StudentSearchFiltersProps) {
  const patch = (partial: Partial<AdvancedFilters>) => onFiltersChange({ ...filters, ...partial });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Real-time search…"
            className="focus-ring-brand admin-card w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white"
          />
        </div>
        <select
          value={searchField}
          onChange={(e) => onSearchFieldChange(e.target.value as StudentSearchFiltersProps['searchField'])}
          className="focus-ring-brand admin-card rounded-xl px-3 py-2.5 text-sm text-white"
        >
          <option value="all">All fields</option>
          <option value="name">Name</option>
          <option value="phone">Phone</option>
          <option value="email">Username / email</option>
          <option value="id">Student ID</option>
          <option value="seat">Seat number</option>
        </select>
        <button
          type="button"
          onClick={onToggleFilters}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Filters
        </button>
      </div>

      {showFilters ? (
        <div className="student-filters-panel admin-card rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Advanced filters</p>
            <button type="button" onClick={onResetFilters} className="text-xs font-semibold text-primary">
              Reset all
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Status</p>
              <FilterCheck label="Active" checked={filters.statusActive} onChange={(v) => patch({ statusActive: v })} />
              <FilterCheck label="Expired" checked={filters.statusExpired} onChange={(v) => patch({ statusExpired: v })} />
              <FilterCheck
                label="Expiring soon"
                checked={filters.statusExpiring}
                onChange={(v) => patch({ statusExpiring: v })}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Membership</p>
              <FilterCheck
                label="Monthly"
                checked={filters.membershipMonthly}
                onChange={(v) => patch({ membershipMonthly: v })}
              />
              <FilterCheck
                label="Quarterly"
                checked={filters.membershipQuarterly}
                onChange={(v) => patch({ membershipQuarterly: v })}
              />
              <FilterCheck
                label="Yearly"
                checked={filters.membershipYearly}
                onChange={(v) => patch({ membershipYearly: v })}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Fee status</p>
              <FilterCheck label="Paid" checked={filters.feePaid} onChange={(v) => patch({ feePaid: v })} />
              <FilterCheck label="Pending" checked={filters.feePending} onChange={(v) => patch({ feePending: v })} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Attendance</p>
              <FilterCheck
                label="Regular (≥70%)"
                checked={filters.attendanceRegular}
                onChange={(v) => patch({ attendanceRegular: v })}
              />
              <FilterCheck
                label="Low (&lt;70%)"
                checked={filters.attendanceLow}
                onChange={(v) => patch({ attendanceLow: v })}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Seat</p>
              <FilterCheck
                label="Assigned"
                checked={filters.seatAssigned}
                onChange={(v) => patch({ seatAssigned: v })}
              />
              <FilterCheck
                label="Unassigned"
                checked={filters.seatUnassigned}
                onChange={(v) => patch({ seatUnassigned: v })}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { DEFAULT_ADVANCED_FILTERS };
