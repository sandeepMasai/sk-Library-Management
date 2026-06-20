import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdvancedSection } from '../components/settings/AdvancedSection';
import { AppearanceSection } from '../components/settings/AppearanceSection';
import { AttendanceSettingsSection } from '../components/settings/AttendanceSettingsSection';
import { BillingSection } from '../components/settings/BillingSection';
import { LibraryProfileSection } from '../components/settings/LibraryProfileSection';
import { NotificationsSection } from '../components/settings/NotificationsSection';
import { SeatSettingsSection } from '../components/settings/SeatSettingsSection';
import { SecuritySection } from '../components/settings/SecuritySection';
import {
  loadAppearancePrefs,
  loadNotifyPrefs,
  saveAppearancePrefs,
  saveNotifyPrefs,
  searchSettingsSections,
  SETTINGS_NAV,
  type AppearancePrefs,
  type NotifyPrefs,
  type SaveStatus,
  type SettingsSectionId,
} from '../components/settings/settingsConfig';
import { SettingsSkeleton } from '../components/settings/SettingsPrimitives';
import { SettingsMobileDrawer, SettingsSidebar } from '../components/settings/SettingsSidebar';
import { SettingsSaveIndicator } from '../components/settings/SettingsSaveIndicator';
import { StudentSettingsSection } from '../components/settings/StudentSettingsSection';
import {
  fetchLibraryProfile,
  fetchSubscriptionMe,
  updateAttendanceSettings,
  type SubscriptionMe,
} from '../api/libraryApi';

type ProfileData = Record<string, unknown>;

const SAVE_IDLE_MS = 2200;

export function AdminSettings() {
  const { user } = useAuth();
  const [section, setSection] = useState<SettingsSectionId>('profile');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [sub, setSub] = useState<SubscriptionMe | null>(null);
  const [attendanceActiveOnly, setAttendanceActiveOnly] = useState(true);

  const [notifyPrefs, setNotifyPrefs] = useState<NotifyPrefs>(() => loadNotifyPrefs());
  const [appearancePrefs, setAppearancePrefs] = useState<AppearancePrefs>(() => loadAppearancePrefs());

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaved = useCallback(() => {
    setSaveStatus('saved');
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setSaveStatus('idle'), SAVE_IDLE_MS);
  }, []);

  const markSaving = useCallback(() => {
    setSaveStatus('saving');
    setSaveError('');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [profileRes, subRes] = await Promise.all([
          fetchLibraryProfile(),
          fetchSubscriptionMe(),
        ]);
        if (!alive) return;
        const p = (profileRes.profile || {}) as ProfileData;
        setProfile(p);
        setAttendanceActiveOnly(p.attendanceActiveMembersOnly !== false);
        setSub(subRes);
      } catch {
        if (!alive) return;
        setProfile(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const p = profile || (user as ProfileData) || {};

  const visibleNav = useMemo(() => {
    const ids = searchSettingsSections(search);
    return SETTINGS_NAV.filter((item) => ids.includes(item.id));
  }, [search]);

  const currentNav = SETTINGS_NAV.find((n) => n.id === section);

  async function toggleAttendance(next: boolean) {
    markSaving();
    try {
      await updateAttendanceSettings(next);
      setAttendanceActiveOnly(next);
      markSaved();
    } catch (e) {
      setSaveStatus('error');
      setSaveError(e instanceof Error ? e.message : 'Failed to save attendance settings');
    }
  }

  function patchNotify(patch: Partial<NotifyPrefs>) {
    setNotifyPrefs((prev) => {
      const next = { ...prev, ...patch };
      markSaving();
      saveNotifyPrefs(next);
      queueMicrotask(markSaved);
      return next;
    });
  }

  function patchAppearance(patch: Partial<AppearancePrefs>) {
    setAppearancePrefs((prev) => {
      const next = { ...prev, ...patch };
      markSaving();
      saveAppearancePrefs(next);
      queueMicrotask(markSaved);
      return next;
    });
  }

  function selectSection(id: SettingsSectionId) {
    setSection(id);
    setDrawerOpen(false);
  }

  function renderSection() {
    if (loading) return <SettingsSkeleton />;

    switch (section) {
      case 'profile':
        return (
          <LibraryProfileSection
            profile={p}
            onProfileUpdated={(next) => setProfile(next)}
            onSaving={markSaving}
            onSaved={markSaved}
            onSaveError={(msg) => {
              setSaveStatus('error');
              setSaveError(msg);
            }}
          />
        );
      case 'students':
        return <StudentSettingsSection />;
      case 'attendance':
        return (
          <AttendanceSettingsSection
            activeMembersOnly={attendanceActiveOnly}
            saving={saveStatus === 'saving'}
            onToggleActiveMembers={toggleAttendance}
          />
        );
      case 'seats':
        return <SeatSettingsSection totalSeats={p.totalSeats as string | number | undefined} />;
      case 'notifications':
        return <NotificationsSection prefs={notifyPrefs} onChange={patchNotify} />;
      case 'billing':
        return <BillingSection />;
      case 'security':
        return <SecuritySection />;
      case 'appearance':
        return <AppearanceSection prefs={appearancePrefs} onChange={patchAppearance} />;
      case 'advanced':
        return <AdvancedSection />;
      default:
        return null;
    }
  }

  return (
    <div className="settings-page admin-dashboard-pad page-pad pb-24 lg:pb-8">
      <AdminPageHeader
        title="Settings"
        subtitle="Manage library profile, attendance rules, notifications, security, billing, and application preferences."
        actions={<SettingsSaveIndicator status={saveStatus} error={saveError} />}
      />

      <div className="settings-search mb-6">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search settings… e.g. attendance, billing, QR"
            className="focus-ring-brand admin-card w-full rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40"
          />
        </div>
        {search.trim() && visibleNav.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  selectSection(item.id);
                  setSearch('');
                }}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {search.trim() && visibleNav.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No settings matched &ldquo;{search}&rdquo;</p>
        ) : null}
      </div>

      <div className="settings-layout flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="settings-sidebar-wrap hidden w-64 shrink-0 lg:block">
          <div className="settings-sidebar-panel admin-card rounded-2xl p-3 backdrop-blur-sm">
            <SettingsSidebar items={visibleNav.length ? visibleNav : SETTINGS_NAV} active={section} onSelect={selectSection} />
          </div>
        </aside>

        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="admin-card flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold text-white"
          >
            <span>
              {currentNav?.icon} {currentNav?.label}
            </span>
            <span className="text-muted">Menu</span>
          </button>
        </div>

        <div className="settings-content min-w-0 flex-1">
          <div className="settings-content-inner admin-card rounded-2xl p-5 sm:p-6 lg:p-8">
            {renderSection()}
          </div>
        </div>
      </div>

      <div className="settings-mobile-save fixed bottom-[4.5rem] left-0 right-0 z-30 flex justify-center px-4 lg:hidden">
        <SettingsSaveIndicator status={saveStatus} error={saveError} className="shadow-lg" />
      </div>

      <SettingsMobileDrawer
        open={drawerOpen}
        items={visibleNav.length ? visibleNav : SETTINGS_NAV}
        active={section}
        onSelect={selectSection}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
