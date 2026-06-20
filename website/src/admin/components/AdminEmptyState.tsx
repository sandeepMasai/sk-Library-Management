import type { ReactNode } from 'react';

type AdminEmptyStateProps = {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function AdminEmptyState({ icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="admin-card flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <p className="mt-3 font-semibold text-white">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-white/70">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
