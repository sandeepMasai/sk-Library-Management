const icons: Record<string, string> = {
  dashboard: '▦',
  students: '👥',
  attendance: '📷',
  seats: '🪑',
  communications: '💬',
  subscription: '💳',
  settings: '⚙',
  libraries: '🏛',
  subscriptions: '📊',
  payments: '💳',
  plans: '📋',
  notifications: '🔔',
};

export function DashboardNavIcon({ name }: { name: keyof typeof icons | string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" aria-hidden>
      {icons[name] ?? '•'}
    </span>
  );
}
