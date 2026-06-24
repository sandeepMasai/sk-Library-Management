import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';

export function RouteErrorPage() {
  const error = useRouteError();
  const isResponse = isRouteErrorResponse(error);
  const message = isResponse
    ? error.statusText || error.data?.message || `Error ${error.status}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong';

  return (
    <div className="page-pad flex min-h-[40vh] flex-col items-center justify-center text-center">
      <p className="text-4xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Page could not load</h1>
      <p className="mt-2 max-w-md text-sm text-white/65">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow hover:brightness-105"
        >
          Reload page
        </button>
        <Link
          to="/superadmin/dashboard"
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
