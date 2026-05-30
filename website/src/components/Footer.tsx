import { Link } from 'react-router-dom';
import { FOOTER_LINKS, SITE } from '../content/site';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="relative border-t border-primary/20 bg-[#060d18] text-slate-300">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 sm:gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo showName size="md" linkToHome variant="light" className="[&_img]:ring-2 [&_img]:ring-primary/30" />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">{SITE.tagline}</p>
            <p className="mt-6 space-y-1 text-sm">
              <a href={`mailto:${SITE.supportEmail}`} className="block text-teal-300 transition hover:text-white">
                {SITE.supportEmail}
              </a>
              <span className="block text-slate-500">{SITE.noreplyEmail} (automated emails)</span>
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Product</p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_LINKS.company.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm transition hover:text-teal-300">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Legal</p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_LINKS.legal.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm transition hover:text-teal-300">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-white/10 pt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {SITE.company}. All rights reserved. Payments via Razorpay.
        </p>
      </div>
    </footer>
  );
}
