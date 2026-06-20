import { SettingsCard, SettingsGroup, SettingsSection } from './SettingsPrimitives';
import { SettingsToggle } from './SettingsToggle';

export function StudentSettingsSection() {
  return (
    <SettingsSection
      title="Student settings"
      description="Configure how students register and maintain memberships."
    >
      <SettingsCard>
        <SettingsGroup title="Student registration">
          <SettingsToggle label="Allow new student registration" description="Students can be added by admin and via app flows." checked disabled badge="Managed in app" />
          <SettingsToggle label="Auto generate student ID" description="System assigns unique student identifiers." checked disabled badge="System default" />
          <SettingsToggle label="Require phone number" description="Mobile number required for all students." checked disabled />
          <SettingsToggle label="Require profile photo" description="Photo upload required during registration." checked={false} disabled badge="Optional" />
          <SettingsToggle label="Require ID proof" description="Government ID verification for new students." checked={false} disabled badge="Optional" />
        </SettingsGroup>
      </SettingsCard>

      <SettingsCard>
        <SettingsGroup title="Membership rules">
          <SettingsToggle label="Membership required" description="Students must have an active plan to use library services." checked disabled badge="Active" />
          <SettingsToggle label="Block expired membership" description="Expired students are blocked from attendance and seats." checked disabled badge="Enforced" />
          <SettingsToggle label="Show renewal reminder" description="Remind students before membership expiry." checked disabled badge="Enabled" />
        </SettingsGroup>
      </SettingsCard>
    </SettingsSection>
  );
}
