import { updateAttendanceSettings } from '../../api/libraryApi';

type AttendanceSettingsPanelProps = {
  activeMembersOnly: boolean;
  onUpdated: (v: boolean) => void;
};

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="admin-card flex items-start justify-between gap-4 rounded-xl p-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || !onChange}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-5 w-5 rounded text-primary"
      />
    </label>
  );
}

export function AttendanceSettingsPanel({ activeMembersOnly, onUpdated }: AttendanceSettingsPanelProps) {
  async function toggleActiveOnly(next: boolean) {
    await updateAttendanceSettings(next);
    onUpdated(next);
  }

  return (
    <div className="admin-card rounded-2xl p-4">
      <h3 className="font-semibold text-white">Attendance settings</h3>
      <div className="mt-3 space-y-2">
        <Toggle label="QR attendance enabled" checked disabled />
        <Toggle
          label="Active membership required"
          description="Only active members can mark attendance"
          checked={activeMembersOnly}
          onChange={toggleActiveOnly}
        />
        <Toggle label="Block expired membership" checked={activeMembersOnly} disabled />
        <Toggle label="Auto check-out" checked={false} disabled description="Managed in mobile app" />
        <Toggle label="Attendance notifications" checked disabled description="Mobile app" />
        <Toggle label="Attendance reports" checked disabled description="Export from this page" />
      </div>
    </div>
  );
}
