type TablePaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  return [...pages].sort((a, b) => a - b);
}

export function TablePagination({
  page,
  totalPages,
  total,
  onPageChange,
  className = '',
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const nums = pageNumbers(page, totalPages);

  return (
    <div className={`mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between ${className}`}>
      <p className="text-sm text-muted">
        {total != null ? (
          <>
            Page <span className="font-medium text-slate-700">{page}</span> of{' '}
            <span className="font-medium text-slate-700">{totalPages}</span>
            <span className="hidden sm:inline"> · {total.toLocaleString('en-IN')} total</span>
          </>
        ) : (
          <>
            Page {page} of {totalPages}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {nums.map((n, i) => {
          const prev = nums[i - 1];
          const showEllipsis = prev != null && n - prev > 1;
          return (
            <span key={n} className="flex items-center gap-1.5">
              {showEllipsis ? <span className="px-1 text-sm text-muted">…</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(n)}
                className={`min-w-[2.25rem] rounded-lg border px-2.5 py-1.5 text-sm font-medium transition ${
                  n === page
                    ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {n}
              </button>
            </span>
          );
        })}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
