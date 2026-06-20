type SettingsFieldProps = {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
};

export function SettingsField({ label, value, hint, mono }: SettingsFieldProps) {
  return (
    <div className="settings-field admin-card rounded-2xl px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-sm font-medium text-white ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="settings-section space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-white/70">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`settings-card admin-card rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="settings-skeleton space-y-6">
      <div className="admin-skeleton h-8 w-48 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="admin-skeleton h-64 rounded-2xl" />
        <div className="admin-skeleton h-64 rounded-2xl" />
      </div>
      <div className="admin-skeleton h-40 rounded-2xl" />
    </div>
  );
}

export function SettingsEmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="settings-empty admin-card flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 px-6 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="mt-3 font-semibold text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
