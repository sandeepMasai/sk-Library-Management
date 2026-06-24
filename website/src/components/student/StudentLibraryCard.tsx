import { formatDisplayName } from '../../utils/formatName';

export type StudentLibraryCardUser = {
  name: string;
  username: string;
  mobile: string;
  joinDate?: string | null;
  expiryDate?: string | null;
  feeStatus?: string;
  feeAmount?: number;
  photoUrl?: string | null;
  isBlocked?: boolean;
  library?: { libraryName?: string } | null;
};

function formatCardDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(expiryDate?: string | null) {
  if (!expiryDate) return 0;
  const end = new Date(expiryDate).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

function feeColor(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'text-emerald-300';
  if (s.includes('half') || s === 'partial') return 'text-amber-300';
  return 'text-rose-300';
}

type StudentLibraryCardProps = {
  user: StudentLibraryCardUser;
};

export function StudentLibraryCard({ user }: StudentLibraryCardProps) {
  const left = daysLeft(user.expiryDate);
  const isExpired = left < 0;
  const isExpiringSoon = !isExpired && left <= 7;
  const displayDays = isExpired ? 0 : left;

  const statusLabel = user.isBlocked ? 'Blocked' : isExpired ? 'Expired' : 'Active';
  const statusColor = user.isBlocked ? '#F87171' : isExpired ? '#FCD34D' : '#34D399';
  const daysColor = isExpired ? 'text-rose-300' : isExpiringSoon ? 'text-amber-300' : 'text-emerald-300';

  const displayName = formatDisplayName(user.name);
  const libraryName = user.library?.libraryName?.trim() || '';

  return (
    <div className="student-library-card relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-900 p-0 shadow-2xl shadow-indigo-950/40">
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/6" aria-hidden />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/6" aria-hidden />

      <div className="relative flex items-center justify-between px-5 pb-1 pt-4">
        <div className="flex items-center gap-2 text-indigo-200">
          <span aria-hidden>🏛️</span>
          <span className="text-[11px] font-extrabold tracking-[0.2em]">LIBDESK</span>
        </div>
        <div
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide"
          style={{ borderColor: statusColor, color: statusColor, backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          {statusLabel}
        </div>
      </div>

      <div className="relative flex items-center gap-3.5 px-5 pb-5 pt-3">
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            alt=""
            className="h-[4.25rem] w-[4.25rem] rounded-[1.25rem] border-[2.5px] border-white/30 object-cover"
          />
        ) : (
          <div className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.25rem] border-[2.5px] border-white/20 bg-white/10 text-3xl font-extrabold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-extrabold tracking-tight text-white">Name: {displayName}</p>
          {libraryName ? (
            <p className="mt-0.5 truncate text-xs font-extrabold uppercase text-white/80">Library: {libraryName}</p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-indigo-200">Username: @{user.username}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-100/90">
            <span aria-hidden>📱</span>
            {user.mobile}
          </p>
        </div>

        <div className="min-w-[3.25rem] rounded-2xl bg-black/20 px-2.5 py-2 text-center">
          <p className={`text-2xl font-extrabold leading-none ${daysColor}`}>{displayDays}</p>
          <p className="mt-1 text-[9px] font-bold leading-tight text-indigo-200">
            days
            <br />
            left
          </p>
        </div>
      </div>

      <div className="mx-5 h-px bg-white/12" />

      <div className="grid grid-cols-3 px-5 py-4 text-center">
        <div>
          <p className="text-[8px] font-extrabold tracking-[0.08em] text-indigo-300">ACTIVE FROM</p>
          <p className="mt-1 text-xs font-extrabold text-indigo-100">{formatCardDate(user.joinDate)}</p>
        </div>
        <div className="border-x border-white/10">
          <p className="text-[8px] font-extrabold tracking-[0.08em] text-indigo-300">ACTIVE TO</p>
          <p className="mt-1 text-xs font-extrabold text-indigo-100">{formatCardDate(user.expiryDate)}</p>
        </div>
        <div>
          <p className="text-[8px] font-extrabold tracking-[0.08em] text-indigo-300">FEE</p>
          <p className={`mt-1 text-xs font-extrabold ${feeColor(user.feeStatus)}`}>{user.feeStatus || '—'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-black/30 px-5 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <p className="text-base font-extrabold text-white">₹ {user.feeAmount ?? 0}</p>
        <p className="text-[7px] font-extrabold tracking-[0.14em] text-indigo-300">LIBRARY STUDENT CARD</p>
      </div>
    </div>
  );
}
