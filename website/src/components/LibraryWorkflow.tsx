import { Link } from 'react-router-dom';
import { DAILY_WORKFLOW } from '../content/site';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { GlassCard } from './ui/GlassCard';
import { SectionHeader } from './ui/SectionHeader';

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
      <SectionHeader emoji="⚡ Workflow" title={title} subtitle={subtitle} />
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
            <GlassCard key={step.key} hover padding="lg" className="relative flex flex-col">
              <span className="absolute right-5 top-5 font-display text-3xl font-black text-primary/15">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-3xl">{step.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{step.desc}</p>
              <Link to={to} className="mt-6">
                <Button variant={step.key === 'download-app' ? 'primary' : 'outline'} fullWidth>
                  {cta}
                </Button>
              </Link>
            </GlassCard>
          );
        })}
      </div>
      {!isLibrary ? (
        <p className="mt-8 text-center text-sm text-muted">
          New library?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Register free
          </Link>{' '}
          — then complete these steps from your admin dashboard.
        </p>
      ) : null}
    </section>
  );
}
