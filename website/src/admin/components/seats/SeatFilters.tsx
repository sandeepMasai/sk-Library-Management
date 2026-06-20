import type { SeatFilters as SeatFiltersState } from '../../utils/seatHelpers';
import { DEFAULT_SEAT_FILTERS } from '../../utils/seatHelpers';

type SeatFiltersProps = {
  search: string;
  filters: SeatFiltersState;
  floorFilter: string;
  floorOptions: string[];
  showFilters: boolean;
  onSearchChange: (v: string) => void;
  onFiltersChange: (v: SeatFiltersState) => void;
  onFloorChange: (v: string) => void;
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
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-primary focus:ring-primary"
      />
      {label}
    </label>
  );
}

export function SeatFilters({
  search,
  filters,
  floorFilter,
  floorOptions,
  showFilters,
  onSearchChange,
  onFiltersChange,
  onFloorChange,
  onToggleFilters,
  onResetFilters,
}: SeatFiltersProps) {
  const patch = (partial: Partial<SeatFiltersState>) => onFiltersChange({ ...filters, ...partial });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search seat, student, or phone…"
            className="focus-ring-brand admin-card w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white"
          />
        </div>
        <select
          value={floorFilter}
          onChange={(e) => onFloorChange(e.target.value)}
          className="focus-ring-brand admin-card rounded-xl px-3 py-2.5 text-sm text-white"
        >
          <option value="all">All floors</option>
          {floorOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onToggleFilters}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
        >
          Filters
        </button>
      </div>

      {showFilters ? (
        <div className="seat-filters-panel admin-card rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Advanced filters</p>
            <button type="button" onClick={onResetFilters} className="text-xs font-semibold text-primary">
              Reset all
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Seat status</p>
              <FilterCheck label="Occupied" checked={filters.occupied} onChange={(v) => patch({ occupied: v })} />
              <FilterCheck label="Available" checked={filters.available} onChange={(v) => patch({ available: v })} />
              <FilterCheck label="Reserved" checked={filters.reserved} onChange={(v) => patch({ reserved: v })} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Membership status</p>
              <FilterCheck
                label="Active"
                checked={filters.membershipActive}
                onChange={(v) => patch({ membershipActive: v })}
              />
              <FilterCheck
                label="Expiring soon"
                checked={filters.membershipExpiring}
                onChange={(v) => patch({ membershipExpiring: v })}
              />
              <FilterCheck
                label="Expired"
                checked={filters.membershipExpired}
                onChange={(v) => patch({ membershipExpired: v })}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Floor</p>
              <FilterCheck
                label="All floors"
                checked={floorFilter === 'all'}
                onChange={() => onFloorChange('all')}
              />
              {floorOptions.map((f) => (
                <FilterCheck
                  key={f}
                  label={f}
                  checked={floorFilter === f}
                  onChange={() => onFloorChange(floorFilter === f ? 'all' : f)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { DEFAULT_SEAT_FILTERS };
