type SettingsToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  badge?: string;
  onChange?: (value: boolean) => void;
};

export function SettingsToggle({ label, description, checked, disabled, badge, onChange }: SettingsToggleProps) {
  const interactive = Boolean(onChange) && !disabled;

  return (
    <label
      className={`settings-toggle-row admin-card flex items-start justify-between gap-4 rounded-2xl p-4 transition ${
        interactive ? 'cursor-pointer hover:bg-white/15' : 'opacity-90'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white">{label}</p>
          {badge ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
              {badge}
            </span>
          ) : null}
        </div>
        {description ? <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={!interactive}
        onClick={() => interactive && onChange?.(!checked)}
        className={`settings-switch relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-primary' : 'bg-white/20'
        } ${!interactive ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-[1.35rem]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}
