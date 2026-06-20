import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../content/site';
import { Logo } from './Logo';
import { GlassCard } from './ui/GlassCard';

const AUTH_FEATURES = [
  { icon: '📱', label: 'QR attendance & live seat maps' },
  { icon: '💳', label: 'Razorpay billing & renewals' },
  { icon: '🔔', label: 'WhatsApp-ready notifications' },
] as const;

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  onLogoEasterEgg?: () => void;
  mode?: 'login' | 'register';
  /** Wider form column for multi-field pages like register */
  wide?: boolean;
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  onLogoEasterEgg,
  mode = 'login',
  wide = false,
}: AuthShellProps) {
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onFormLogoTap() {
    if (!onLogoEasterEgg) return;
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => {
      logoTapCount.current = 0;
    }, 2000);
    if (logoTapCount.current >= 7) {
      logoTapCount.current = 0;
      onLogoEasterEgg();
    }
  }

  const heroTitle =
    mode === 'register' ? 'Launch your library on SmartLibDesk' : 'Manage your library with confidence';
  const heroText =
    mode === 'register'
      ? 'Register once, then run attendance, seats, students, and subscriptions from one modern dashboard.'
      : 'Sign in to your workspace for attendance, seats, student plans, and billing — built for Indian study libraries.';

  return (
    <div className="auth-page">
      <div className="auth-page-grid">
        <aside className="auth-visual" aria-hidden={false}>
          <img
            src="/auth-library-hero.jpg"
            alt=""
            className="auth-visual-image"
            loading="eager"
            decoding="async"
          />
          <div className="auth-visual-overlay" />
          <div className="auth-visual-content">
            <Logo size="md" variant="light" linkToHome />
            <div className="auth-visual-copy">
              <p className="auth-visual-eyebrow">Library SaaS · India</p>
              <h2 className="auth-visual-title">{heroTitle}</h2>
              <p className="auth-visual-text">{heroText}</p>
            </div>
            <ul className="auth-visual-features">
              {AUTH_FEATURES.map((item) => (
                <li key={item.label}>
                  <span className="auth-visual-feature-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            <div className="auth-visual-stats">
              <div className="auth-visual-stat">
                <p className="auth-visual-stat-value">500+</p>
                <p className="auth-visual-stat-label">Libraries</p>
              </div>
              <div className="auth-visual-stat">
                <p className="auth-visual-stat-value">10K+</p>
                <p className="auth-visual-stat-label">Daily check-ins</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="auth-form-panel">
          <div className={`auth-form-inner ${wide ? 'auth-form-inner--wide' : ''}`}>
            <div className="auth-mobile-badge lg:hidden">
              <Logo size="sm" variant="light" linkToHome showName={false} />
              <span>{SITE.name}</span>
            </div>

            <GlassCard dark padding="lg" className="auth-form-card !rounded-3xl">
              {mode !== 'register' ? (
                <div
                  className={`auth-form-logo ${onLogoEasterEgg ? 'cursor-default select-none' : ''}`}
                  onClick={onFormLogoTap}
                  role={onLogoEasterEgg ? 'button' : undefined}
                  tabIndex={onLogoEasterEgg ? 0 : undefined}
                >
                  <Logo size="lg" linkToHome={!onLogoEasterEgg} variant="light" />
                </div>
              ) : null}
              <h1 className="auth-form-title">{title}</h1>
              <p className="auth-form-subtitle">{subtitle}</p>
              <div className="auth-form-body">{children}</div>
              {footer ? <div className="auth-form-footer">{footer}</div> : null}
            </GlassCard>

            <p className="auth-form-legal">
              By continuing, you agree to our{' '}
              <Link to="/terms" className="text-teal-400 hover:text-teal-300">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" className="text-teal-400 hover:text-teal-300">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
