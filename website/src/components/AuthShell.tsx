import { useRef, type ReactNode } from 'react';
import { Logo } from './Logo';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** After 7 taps on the form logo (e.g. open super admin login). */
  onLogoEasterEgg?: () => void;
};

export function AuthShell({ title, subtitle, children, footer, onLogoEasterEgg }: AuthShellProps) {
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
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#0b3d36] via-primary to-accent p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Logo size="md" variant="light" />
            <h2 className="mt-16 text-3xl font-bold leading-tight">Built for modern study libraries</h2>
            <p className="mt-4 max-w-md text-white/80">
              QR attendance, seat maps, student plans, Razorpay subscriptions, and real-time notifications — all in one
              platform.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/90">
            <li className="flex items-center gap-2">✓ Multi-tenant — each library isolated</li>
            <li className="flex items-center gap-2">✓ Indian mobile + PIN student login</li>
            <li className="flex items-center gap-2">✓ Secure Razorpay billing</li>
          </ul>
        </div>

        <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div
              className={`mb-8 flex justify-center ${onLogoEasterEgg ? 'cursor-default select-none' : ''}`}
              onClick={onFormLogoTap}
              role={onLogoEasterEgg ? 'button' : undefined}
              tabIndex={onLogoEasterEgg ? 0 : undefined}
            >
              <Logo size="lg" linkToHome={!onLogoEasterEgg} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
