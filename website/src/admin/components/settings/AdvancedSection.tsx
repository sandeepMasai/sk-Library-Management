import { Button } from '../../../components/ui/Button';
import { SettingsCard, SettingsGroup, SettingsSection } from './SettingsPrimitives';

export function AdvancedSection() {
  return (
    <SettingsSection title="Advanced settings" description="Export data, manage backups, and access destructive actions.">
      <SettingsCard>
        <SettingsGroup title="Data export">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" disabled>
              Export students
            </Button>
            <Button variant="outline" disabled>
              Export attendance
            </Button>
            <Button variant="outline" disabled>
              Export payments
            </Button>
          </div>
          <p className="text-xs text-muted">Exports are available from Students, Attendance, and Fees modules.</p>
        </SettingsGroup>
      </SettingsCard>

      <SettingsCard>
        <SettingsGroup title="Backup settings">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled>
              Create backup
            </Button>
            <Button variant="outline" disabled>
              Restore backup
            </Button>
          </div>
          <p className="text-xs text-muted">Cloud backup is managed via the SmartLibDesk mobile app.</p>
        </SettingsGroup>
      </SettingsCard>

      <SettingsCard className="border-red-400/30">
        <SettingsGroup title="Danger zone">
          <p className="text-sm text-red-200">Permanently delete library data. This action cannot be undone.</p>
          <Button variant="outline" className="border-red-400/40 text-red-200 hover:bg-red-500/10" disabled>
            Delete library data
          </Button>
          <p className="text-xs text-red-200/70">Requires confirmation and is only available from support.</p>
        </SettingsGroup>
      </SettingsCard>
    </SettingsSection>
  );
}
