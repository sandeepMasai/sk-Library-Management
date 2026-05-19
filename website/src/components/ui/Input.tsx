import type { InputHTMLAttributes, ReactNode } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
};

export function Input({ label, hint, error, icon, className = '', id, ...props }: InputProps) {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span> : null}
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${icon ? 'pl-10' : ''} ${error ? 'border-red-400' : 'border-slate-200'} ${className}`}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
