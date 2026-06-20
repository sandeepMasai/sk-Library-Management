type SuperAdminPaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  return [...pages].sort((a, b) => a - b);
}

export function SuperAdminPagination({
  page,
  totalPages,
  total,
  onPageChange,
  className = '',
}: SuperAdminPaginationProps) {
  if (totalPages <= 1) return null;

  const nums = pageNumbers(page, totalPages);
  const btn =
    'rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className={`mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between ${className}`}>
      <p className="text-sm text-white/65">
        {total != null ? (
          <>
            Page <span className="font-medium text-white">{page}</span> of{' '}
            <span className="font-medium text-white">{totalPages}</span>
            <span className="hidden sm:inline"> · {total.toLocaleString('en-IN')} total</span>
          </>
        ) : (
          <>Page {page} of {totalPages}</>
        )}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={btn}>
          Previous
        </button>

        {nums.map((n, i) => {
          const prev = nums[i - 1];
          const showEllipsis = prev != null && n - prev > 1;
          return (
            <span key={n} className="flex items-center gap-1.5">
              {showEllipsis ? <span className="px-1 text-sm text-white/50">…</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(n)}
                className={`min-w-[2.25rem] rounded-lg border px-2.5 py-1.5 text-sm font-medium transition ${
                  n === page
                    ? 'border-white bg-white text-emerald-800 shadow-sm'
                    : 'border-white/20 bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                {n}
              </button>
            </span>
          );
        })}

        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={btn}>
          Next
        </button>
      </div>
    </div>
  );
}
