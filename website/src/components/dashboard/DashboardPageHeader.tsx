import { Link } from 'react-router-dom';

type DashboardPageHeaderProps = {
  title: string;
  subtitle?: string;
  dark?: boolean;
  action?: { label: string; to?: string; onClick?: () => void };
};

export function DashboardPageHeader({ title, subtitle, dark = false, action }: DashboardPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className={`font-display text-2xl font-bold tracking-tight sm:text-3xl ${dark ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </h1>
        {subtitle ? (
          <p className={`mt-1 text-sm ${dark ? 'text-white/65' : 'text-muted'}`}>{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        action.to ? (
          <Link
            to={action.to}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              dark
                ? 'bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/20'
                : 'bg-primary text-white shadow-md shadow-primary/20 hover:brightness-110'
            }`}
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              dark
                ? 'bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/20'
                : 'bg-primary text-white shadow-md shadow-primary/20 hover:brightness-110'
            }`}
          >
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
