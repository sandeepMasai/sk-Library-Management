type Option = { value: string; label: string };

type AdminFilterPillsProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

export function AdminFilterPills({ options, value, onChange }: AdminFilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            value === opt.value
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'border border-white/20 bg-white/10 text-white/80 hover:bg-white/15'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
