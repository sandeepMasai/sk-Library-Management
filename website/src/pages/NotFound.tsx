import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-lg text-muted">This page could not be found.</p>
      <Link to="/" className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white">
        Back to home
      </Link>
    </section>
  );
}
