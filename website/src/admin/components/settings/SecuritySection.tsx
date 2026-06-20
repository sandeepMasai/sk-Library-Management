import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { SettingsCard, SettingsField, SettingsGroup, SettingsSection } from './SettingsPrimitives';

export function SecuritySection() {
  const { user, logout } = useAuth();

  return (
    <SettingsSection title="Security settings" description="Protect your admin account and monitor active sessions.">
      <SettingsCard>
        <SettingsGroup title="Account security">
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingsField label="Account email" value={user?.email || '—'} />
            <SettingsField label="Last login" value="Current session" hint="You are signed in on this browser" />
            <SettingsField label="Device" value={typeof navigator !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'Web browser'} />
            <SettingsField label="Role" value="Library admin" />
          </div>
        </SettingsGroup>
      </SettingsCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsCard>
          <h3 className="font-semibold text-white">Change password</h3>
          <p className="mt-1 text-sm text-muted">Update your account password securely from the mobile app.</p>
          <Button variant="outline" className="mt-4" disabled>
            Change password
          </Button>
        </SettingsCard>

        <SettingsCard>
          <h3 className="font-semibold text-white">Two-factor authentication</h3>
          <p className="mt-1 text-sm text-muted">Add an extra layer of security to your admin account.</p>
          <Button variant="outline" className="mt-4" disabled>
            Enable 2FA
          </Button>
        </SettingsCard>

        <SettingsCard>
          <h3 className="font-semibold text-white">Active sessions</h3>
          <p className="mt-1 text-sm text-muted">You are currently signed in on this browser session.</p>
          <Button variant="outline" className="mt-4 text-red-300 hover:bg-red-500/10" onClick={() => logout()}>
            Logout all devices
          </Button>
        </SettingsCard>

        <SettingsCard>
          <h3 className="font-semibold text-white">Login history</h3>
          <p className="mt-1 text-sm text-muted">View recent sign-ins and security events in the mobile app.</p>
          <Button variant="outline" className="mt-4" disabled>
            View login history
          </Button>
        </SettingsCard>
      </div>
    </SettingsSection>
  );
}
