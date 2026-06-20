import type { SaveStatus } from './settingsConfig';

type SettingsSaveIndicatorProps = {
  status: SaveStatus;
  error?: string;
  className?: string;
};

export function SettingsSaveIndicator({ status, error, className = '' }: SettingsSaveIndicatorProps) {
  const label =
    status === 'saving'
      ? 'Saving…'
      : status === 'saved'
        ? '✅ Changes saved'
        : status === 'error'
          ? error || 'Save failed'
          : '✅ All changes saved';

  const tone =
    status === 'saving'
      ? 'border-amber-400/35 bg-white/10 text-amber-100'
      : status === 'error'
        ? 'border-red-400/35 bg-white/10 text-red-200'
        : 'border-white/20 bg-white/10 text-white';

  return (
    <div
      className={`settings-save-indicator admin-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${tone} ${className}`}
      role="status"
      aria-live="polite"
    >
      {status === 'saving' ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
      ) : null}
      {label}
    </div>
  );
}
