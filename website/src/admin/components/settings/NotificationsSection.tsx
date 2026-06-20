import type { NotifyPrefs } from './settingsConfig';
import { SettingsCard, SettingsEmptyState, SettingsGroup, SettingsSection } from './SettingsPrimitives';
import { SettingsToggle } from './SettingsToggle';

type NotificationsSectionProps = {
  prefs: NotifyPrefs;
  onChange: (patch: Partial<NotifyPrefs>) => void;
};

export function NotificationsSection({ prefs, onChange }: NotificationsSectionProps) {
  const hasAny = Object.values(prefs).some(Boolean);

  return (
    <SettingsSection
      title="Notification settings"
      description="Control student alerts and communication channels. Preferences sync locally in this browser."
    >
      {!hasAny ? (
        <SettingsEmptyState
          icon="📩"
          title="No notifications configured"
          description="Enable notification types below to stay connected with your students."
        />
      ) : null}

      <SettingsCard>
        <SettingsGroup title="Student notifications">
          <SettingsToggle label="Fee reminder" checked={prefs.feeReminders} onChange={(v) => onChange({ feeReminders: v })} />
          <SettingsToggle label="Membership expiry alert" checked={prefs.expiryAlerts} onChange={(v) => onChange({ expiryAlerts: v })} />
          <SettingsToggle label="Attendance alert" checked={prefs.attendanceAlerts} onChange={(v) => onChange({ attendanceAlerts: v })} />
          <SettingsToggle label="Holiday notice" checked={prefs.holidayNotice} onChange={(v) => onChange({ holidayNotice: v })} />
          <SettingsToggle label="New announcement" checked={prefs.announcements} onChange={(v) => onChange({ announcements: v })} />
        </SettingsGroup>
      </SettingsCard>

      <SettingsCard>
        <SettingsGroup title="Communication preferences">
          <SettingsToggle label="Push notifications" checked={prefs.pushNotifications} onChange={(v) => onChange({ pushNotifications: v })} />
          <SettingsToggle label="In-app notifications" checked={prefs.inAppNotifications} onChange={(v) => onChange({ inAppNotifications: v })} />
          <SettingsToggle label="WhatsApp integration" description="Send automated WhatsApp messages to students." checked={false} disabled badge="Future" />
          <SettingsToggle label="SMS integration" description="Send SMS alerts for fees and attendance." checked={false} disabled badge="Future" />
        </SettingsGroup>
      </SettingsCard>
    </SettingsSection>
  );
}
