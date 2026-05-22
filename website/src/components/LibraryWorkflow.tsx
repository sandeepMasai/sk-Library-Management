import { Link } from 'react-router-dom';
import { DAILY_WORKFLOW } from '../content/site';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

type LibraryWorkflowProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

export function LibraryWorkflow({
  title = 'Run your library in 3 steps',
  subtitle = 'Add students on the website, display the attendance QR, and have members install the Android app to scan.',
  className = '',
}: LibraryWorkflowProps) {
  const { isAuthenticated, user } = useAuth();
  const isLibrary = isAuthenticated && user?.role === 'library';

  return (
    <section className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted">{subtitle}</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {DAILY_WORKFLOW.map((step, index) => {
          const to = isLibrary ? step.adminPath : step.guestPath;
          const cta = isLibrary
            ? step.key === 'download-app'
              ? 'Download app'
              : step.key === 'add-student'
                ? 'Add student'
                : 'Open attendance QR'
            : step.guestLabel;

          return (
            <article
              key={step.key}
              className="card-hover relative flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <span className="absolute right-5 top-5 text-3xl font-black text-primary/15">{String(index + 1).padStart(2, '0')}</span>
              <span className="text-3xl">{step.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{step.desc}</p>
              <Link to={to} className="mt-6">
                <Button variant={step.key === 'download-app' ? 'primary' : 'outline'} fullWidth>
                  {cta}
                </Button>
              </Link>
            </article>
          );
        })}
      </div>
      {!isLibrary ? (
        <p className="mt-8 text-center text-sm text-muted">
          New library?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Register free
          </Link>{' '}
          — then use the steps above from your admin dashboard.
        </p>
      ) : null}
    </section>
  );
}
