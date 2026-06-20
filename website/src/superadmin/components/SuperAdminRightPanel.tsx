import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { SaasCard } from './SaasCard';

type PanelItem = {
  id: string;
  title: string;
  time?: string;
  icon?: string;
};

type SuperAdminRightPanelProps = {
  notifications?: PanelItem[];
  activities?: PanelItem[];
};

export function SuperAdminRightPanel({ notifications = [], activities = [] }: SuperAdminRightPanelProps) {
  return (
    <div className="space-y-4">
      <SaasCard>
        <h2 className="font-display text-base font-bold text-white">
          <span className="text-emerald-200">Library</span> Messages
        </h2>
        {notifications.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">No admin messages sent to libraries yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm">
                  {n.icon || '🔔'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  {n.time ? <p className="text-xs text-white/60">{n.time}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SaasCard>

      <SaasCard>
        <h2 className="font-display text-base font-bold text-white">
          <span className="text-emerald-200">Recent</span> Activity
        </h2>
        {activities.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">No activity logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-0">
            {activities.map((item, i, arr) => (
              <li key={item.id} className="relative flex gap-3 pb-4 pl-1 last:pb-0">
                {i < arr.length - 1 ? (
                  <span className="absolute left-[7px] top-4 h-full w-px bg-white/20" aria-hidden />
                ) : null}
                <span className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-emerald-800 bg-white shadow-sm" />
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  {item.time ? <p className="text-xs text-white/60">{item.time}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SaasCard>

      <SaasCard brand>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Enterprise Edition</p>
        <h3 className="mt-2 font-display text-lg font-bold text-white">Full Plan Control</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-white/75">
          <li>✓ Unlimited libraries</li>
          <li>✓ Advanced analytics</li>
          <li>✓ Custom plans & offers</li>
        </ul>
        <Link to="/superadmin/plans" className="mt-4 block">
          <Button fullWidth size="sm" className="!from-white !to-emerald-50 !text-emerald-800 hover:!brightness-105">
            Manage Plans
          </Button>
        </Link>
      </SaasCard>
    </div>
  );
}
