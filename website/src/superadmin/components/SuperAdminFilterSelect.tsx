type SuperAdminFilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
};

export function SuperAdminFilterSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: SuperAdminFilterSelectProps) {
  return (
    <div className={`min-w-[160px] flex-1 space-y-1.5 ${className}`}>
      <label className="block text-sm font-medium text-white/80">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="superadmin-select focus-ring-brand w-full cursor-pointer rounded-xl border border-white/20 px-4 py-3 text-sm text-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
