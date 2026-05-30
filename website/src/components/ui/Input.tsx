import type { InputHTMLAttributes, ReactNode } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  dark?: boolean;
};

export function Input({ label, hint, error, icon, dark = false, className = '', id, ...props }: InputProps) {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className={`block text-sm font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}
      >
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-400' : 'text-slate-400'}`}
          >
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          className={`focus-ring-brand w-full rounded-xl border px-4 py-3 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${icon ? 'pl-10' : ''} ${
            error
              ? 'border-red-400'
              : dark
                ? 'border-white/15 bg-white/5 text-white placeholder:text-slate-500'
                : 'border-slate-200/80 bg-white/90 text-slate-900 backdrop-blur-sm'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className={`text-xs ${dark ? 'text-slate-400' : 'text-muted'}`}>{hint}</p>
      ) : null}
    </div>
  );
}
