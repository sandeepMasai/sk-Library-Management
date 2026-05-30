import type { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  dark?: boolean;
};

export function Select({ label, error, options, dark = false, className = '', id, ...props }: SelectProps) {
  const selectId = id || label.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={selectId}
        className={`block text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}
      >
        {label}
      </label>
      <select
        id={selectId}
        className={`focus-ring-brand w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          error
            ? 'border-red-400'
            : dark
              ? 'border-white/15 bg-white/5 text-white'
              : 'border-slate-200/80 bg-white/90 text-slate-900 backdrop-blur-sm'
        } ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
