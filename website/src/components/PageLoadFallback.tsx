/** Shown while lazy-loaded route chunks are downloading. */
export function PageLoadFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8" aria-busy="true" aria-label="Loading page">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
