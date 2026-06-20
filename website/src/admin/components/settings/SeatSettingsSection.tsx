import { SettingsCard, SettingsField, SettingsGroup, SettingsSection } from './SettingsPrimitives';
import { SettingsToggle } from './SettingsToggle';

type SeatSettingsSectionProps = {
  totalSeats?: string | number;
};

export function SeatSettingsSection({ totalSeats }: SeatSettingsSectionProps) {
  return (
    <SettingsSection title="Seat settings" description="Configure seat allocation, occupancy display, and numbering format.">
      <SettingsCard>
        <SettingsGroup title="Seat management">
          <SettingsToggle label="Enable seat allocation" description="Assign students to library seats." checked disabled badge="Enabled" />
          <SettingsToggle label="Auto assign available seats" description="Suggest next available seat during assignment." checked={false} disabled badge="Manual assign" />
          <SettingsToggle label="Show seat occupancy" description="Display occupancy on seat map and dashboard." checked disabled badge="Enabled" />
          <SettingsToggle label="Waiting list support" description="Queue students when all seats are full." checked={false} disabled badge="Coming soon" />
        </SettingsGroup>
      </SettingsCard>

      <SettingsCard>
        <SettingsGroup title="Seat number format">
          <SettingsField label="Current capacity" value={String(totalSeats ?? '—')} hint="Total seats configured in your library" />
          <SettingsField label="Label format" value="A1, A2, A3…" hint="Custom labels supported per seat in Seat Management" />
        </SettingsGroup>
      </SettingsCard>
    </SettingsSection>
  );
}
