type FeaturePillProps = {
  label: string;
  sublabel: string;
  dark?: boolean;
};

export function FeaturePill({ label, sublabel, dark = true }: FeaturePillProps) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center transition duration-300 hover:scale-[1.03] sm:p-5 ${
        dark
          ? 'glass-panel-dark hover-lift-dark border-white/10'
          : 'glass-panel hover-lift border-slate-200/80'
      }`}
    >
      <p className={`text-sm font-bold sm:text-base ${dark ? 'text-white' : 'text-slate-900'}`}>{label}</p>
      <p className={`mt-1 text-xs ${dark ? 'text-teal-200/60' : 'text-muted'}`}>{sublabel}</p>
    </div>
  );
}
