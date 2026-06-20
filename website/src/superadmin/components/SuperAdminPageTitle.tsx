type SuperAdminPageTitleProps = {
  title: string;
  subtitle?: string;
};

export function SuperAdminPageTitle({ title, subtitle }: SuperAdminPageTitleProps) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-white/65">{subtitle}</p> : null}
    </div>
  );
}
