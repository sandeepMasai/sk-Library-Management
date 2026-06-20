import type { AppearancePrefs } from './settingsConfig';
import { SettingsCard, SettingsGroup, SettingsSection } from './SettingsPrimitives';

type AppearanceSectionProps = {
  prefs: AppearancePrefs;
  onChange: (patch: Partial<AppearancePrefs>) => void;
};

function ChoiceCard({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`settings-choice-card flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-semibold transition ${
        selected
          ? 'border-primary bg-primary/20 text-white shadow-sm'
          : 'border-white/20 bg-white/10 text-white/80 hover:border-white/30 hover:bg-white/15'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      {label}
    </button>
  );
}

export function AppearanceSection({ prefs, onChange }: AppearanceSectionProps) {
  return (
    <SettingsSection title="Appearance" description="Customize how SmartLibDesk looks on this device. Stored locally in your browser.">
      <SettingsCard>
        <SettingsGroup title="Theme">
          <div className="grid grid-cols-3 gap-3">
            <ChoiceCard label="Light" icon="☀️" selected={prefs.theme === 'light'} onClick={() => onChange({ theme: 'light' })} />
            <ChoiceCard label="Dark" icon="🌙" selected={prefs.theme === 'dark'} onClick={() => onChange({ theme: 'dark' })} />
            <ChoiceCard label="System" icon="🖥" selected={prefs.theme === 'system'} onClick={() => onChange({ theme: 'system' })} />
          </div>
        </SettingsGroup>
      </SettingsCard>

      <SettingsCard>
        <SettingsGroup title="Dashboard preferences">
          <div className="grid grid-cols-2 gap-3">
            <ChoiceCard label="Compact" icon="▤" selected={prefs.density === 'compact'} onClick={() => onChange({ density: 'compact' })} />
            <ChoiceCard label="Comfortable" icon="▦" selected={prefs.density === 'comfortable'} onClick={() => onChange({ density: 'comfortable' })} />
          </div>
        </SettingsGroup>
      </SettingsCard>

      <SettingsCard>
        <SettingsGroup title="Sidebar style">
          <div className="grid grid-cols-2 gap-3">
            <ChoiceCard label="Expanded" icon="☰" selected={prefs.sidebar === 'expanded'} onClick={() => onChange({ sidebar: 'expanded' })} />
            <ChoiceCard label="Collapsed" icon="≡" selected={prefs.sidebar === 'collapsed'} onClick={() => onChange({ sidebar: 'collapsed' })} />
          </div>
        </SettingsGroup>
      </SettingsCard>
    </SettingsSection>
  );
}
