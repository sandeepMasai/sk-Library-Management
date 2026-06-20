import { Link } from 'react-router-dom';
import { DAILY_WORKFLOW } from '../content/site';
import { useAuth } from '../context/AuthContext';
import { getPlayStoreUrl } from '../lib/appDownload';
import { Button } from './ui/Button';
import { GlassCard } from './ui/GlassCard';
import { SectionHeader } from './ui/SectionHeader';

type LibraryWorkflowProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  dark?: boolean;
};

export function LibraryWorkflow({
  title = 'Run your library in 3 steps',
  subtitle = 'Add students on the website, display the attendance QR, and have members install the Android app to scan.',
  className = '',
  dark = false,
}: LibraryWorkflowProps) {
  const { isAuthenticated, user } = useAuth();
  const isLibrary = isAuthenticated && user?.role === 'library';

  return (
    <section className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`}>
      <SectionHeader emoji="⚡ Workflow" title={title} subtitle={subtitle} dark={dark} />
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

          const isPlayStore = step.key === 'download-app' && !isLibrary;
          const ctaButton = (
            <Button
              variant={step.key === 'download-app' ? 'primary' : 'outline'}
              fullWidth
              className={
                dark && step.key !== 'download-app'
                  ? '!border-white/30 !bg-white/5 !text-white hover:!bg-white/15'
                  : undefined
              }
            >
              {cta}
            </Button>
          );

          return (
            <GlassCard key={step.key} dark={dark} hover padding="lg" className="relative flex flex-col">
              <span
                className={`absolute right-5 top-5 font-display text-3xl font-black ${
                  dark ? 'text-white/10' : 'text-primary/15'
                }`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-3xl">{step.icon}</span>
              <h3 className={`mt-4 text-lg font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{step.title}</h3>
              <p className={`mt-2 flex-1 text-sm leading-relaxed ${dark ? 'text-white/70' : 'text-muted'}`}>
                {step.desc}
              </p>
              {isPlayStore ? (
                <a href={getPlayStoreUrl()} className="mt-6" rel="noopener noreferrer">
                  {ctaButton}
                </a>
              ) : (
                <Link to={to} className="mt-6">
                  {ctaButton}
                </Link>
              )}
            </GlassCard>
          );
        })}
      </div>
      {!isLibrary ? (
        <p className={`mt-8 text-center text-sm ${dark ? 'text-white/70' : 'text-muted'}`}>
          New library?{' '}
          <Link
            to="/register"
            className={`font-semibold hover:underline ${dark ? 'text-teal-300 hover:text-teal-200' : 'text-primary'}`}
          >
            Register free
          </Link>{' '}
          — then complete these steps from your admin dashboard.
        </p>
      ) : null}
    </section>
  );
}
