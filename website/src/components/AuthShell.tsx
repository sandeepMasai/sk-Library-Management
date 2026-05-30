import { useRef, type ReactNode } from 'react';
import { Logo } from './Logo';
import { GlassCard } from './ui/GlassCard';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
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
    <div className="min-h-[calc(100dvh-4rem)] bg-[#0b1220]">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#0b3d36] via-primary to-accent p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-blob" />
          <div>
            <Logo size="md" variant="light" />
            <h2 className="font-display mt-16 text-3xl font-bold leading-tight">
              Built for modern study libraries
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              QR attendance, seat maps, student plans, Razorpay subscriptions, and real-time notifications — all in
              one platform.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/90">
            <li className="flex items-center gap-2">✓ Multi-tenant — each library isolated</li>
            <li className="flex items-center gap-2">✓ Indian mobile + PIN student login</li>
            <li className="flex items-center gap-2">✓ Secure Razorpay billing</li>
          </ul>
        </div>

        <div className="gradient-mesh flex flex-col justify-center px-4 py-10 sm:px-8 sm:py-12 lg:bg-none lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 rounded-2xl border border-white/10 bg-primary/20 p-4 text-center text-sm text-teal-100 lg:hidden">
              Library SaaS · India
            </div>
            <GlassCard dark padding="lg" className="!rounded-3xl">
              <div
                className={`mb-6 flex justify-center ${onLogoEasterEgg ? 'cursor-default select-none' : ''}`}
                onClick={onFormLogoTap}
                role={onLogoEasterEgg ? 'button' : undefined}
                tabIndex={onLogoEasterEgg ? 0 : undefined}
              >
                <Logo size="lg" linkToHome={!onLogoEasterEgg} variant="light" />
              </div>
              <h1 className="font-display text-xl font-bold text-white sm:text-2xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
              <div className="mt-8">{children}</div>
              {footer ? <div className="mt-6 text-center text-sm text-slate-400">{footer}</div> : null}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
