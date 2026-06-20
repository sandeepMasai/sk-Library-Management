import type { SettingsNavItem, SettingsSectionId } from './settingsConfig';

type SettingsSidebarProps = {
  items: SettingsNavItem[];
  active: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  className?: string;
};

export function SettingsSidebar({ items, active, onSelect, className = '' }: SettingsSidebarProps) {
  return (
    <nav className={`settings-sidebar space-y-1 ${className}`} aria-label="Settings sections">
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`settings-nav-item flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${
              isActive
                ? 'admin-nav-active ring-1 ring-blue-400/45'
                : 'text-white/70 hover:bg-white/10 hover:text-white hover:shadow-sm'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="min-w-0 truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

type SettingsMobileDrawerProps = {
  open: boolean;
  items: SettingsNavItem[];
  active: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  onClose: () => void;
};

export function SettingsMobileDrawer({ open, items, active, onSelect, onClose }: SettingsMobileDrawerProps) {
  if (!open) return null;

  return (
    <div className="settings-mobile-drawer fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="admin-card absolute bottom-0 left-0 right-0 max-h-[78vh] overflow-auto rounded-t-3xl p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg font-bold text-white">Settings</p>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/70 hover:bg-white/10">
            ✕
          </button>
        </div>
        <SettingsSidebar
          items={items}
          active={active}
          onSelect={(id) => {
            onSelect(id);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
