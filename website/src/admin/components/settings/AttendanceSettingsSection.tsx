import { SettingsCard, SettingsGroup, SettingsSection } from './SettingsPrimitives';
import { SettingsToggle } from './SettingsToggle';

type AttendanceSettingsSectionProps = {
  activeMembersOnly: boolean;
  saving?: boolean;
  onToggleActiveMembers: (value: boolean) => void;
};

export function AttendanceSettingsSection({
  activeMembersOnly,
  saving,
  onToggleActiveMembers,
}: AttendanceSettingsSectionProps) {
  return (
    <SettingsSection
      title="Attendance settings"
      description="Control QR scanning rules, membership enforcement, and attendance alerts."
    >
      <SettingsCard>
        <SettingsGroup title="Attendance rules">
          <SettingsToggle
            label="Enable attendance system"
            description="Students can check in using QR scan from the mobile app."
            checked
            disabled
            badge="Always on"
          />
          <SettingsToggle
            label="QR code attendance"
            description="Library QR token used for secure check-ins."
            checked
            disabled
            badge="Active"
          />
          <SettingsToggle
            label="Active membership required"
            description="Only students with an active membership can mark attendance."
            checked={activeMembersOnly}
            disabled={saving}
            onChange={onToggleActiveMembers}
          />
          <SettingsToggle
            label="Block expired students"
            description="Expired members are rejected at scan time."
            checked={activeMembersOnly}
            disabled
            badge="Linked to membership rule"
          />
          <SettingsToggle
            label="Auto mark absent"
            description="Automatically mark absent students at end of day."
            checked={false}
            disabled
            badge="Coming soon"
          />
          <SettingsToggle
            label="Allow manual attendance"
            description="Admin can mark attendance manually from the dashboard."
            checked
            disabled
            badge="Available"
          />
        </SettingsGroup>
      </SettingsCard>

      <SettingsCard>
        <SettingsGroup title="Attendance notifications">
          <SettingsToggle label="Attendance success message" description="Notify students after successful check-in." checked disabled badge="Mobile app" />
          <SettingsToggle label="Attendance warning alerts" description="Alert admin on blocked or suspicious scans." checked disabled badge="Mobile app" />
        </SettingsGroup>
      </SettingsCard>
    </SettingsSection>
  );
}
