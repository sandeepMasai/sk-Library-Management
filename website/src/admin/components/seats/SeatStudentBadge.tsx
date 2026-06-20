import { formatDisplayName } from '../../../utils/formatName';

const NAME_COLORS = [
  { ring: 'ring-teal-400/45', bg: 'bg-teal-500/30', initials: 'text-teal-100', name: 'text-teal-200' },
  { ring: 'ring-emerald-400/45', bg: 'bg-emerald-500/30', initials: 'text-emerald-100', name: 'text-emerald-200' },
  { ring: 'ring-sky-400/45', bg: 'bg-sky-500/30', initials: 'text-sky-100', name: 'text-sky-200' },
  { ring: 'ring-violet-400/45', bg: 'bg-violet-500/30', initials: 'text-violet-100', name: 'text-violet-200' },
  { ring: 'ring-rose-400/45', bg: 'bg-rose-500/30', initials: 'text-rose-100', name: 'text-rose-200' },
  { ring: 'ring-amber-400/45', bg: 'bg-amber-500/30', initials: 'text-amber-100', name: 'text-amber-200' },
  { ring: 'ring-cyan-400/45', bg: 'bg-cyan-500/30', initials: 'text-cyan-100', name: 'text-cyan-200' },
  { ring: 'ring-fuchsia-400/45', bg: 'bg-fuchsia-500/30', initials: 'text-fuchsia-100', name: 'text-fuchsia-200' },
] as const;

export function studentInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function studentNameColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

type SeatStudentBadgeProps = {
  name: string;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showName?: boolean;
  className?: string;
};

const sizeMap = {
  xs: {
    avatar: 'h-6 w-6 text-[8px] ring-1',
    name: 'text-[8px] leading-tight',
    gap: 'gap-0.5',
  },
  sm: {
    avatar: 'h-8 w-8 text-[9px] ring-2',
    name: 'text-[9px] leading-tight',
    gap: 'gap-1',
  },
  md: {
    avatar: 'h-10 w-10 text-[11px] ring-2',
    name: 'text-[10px] leading-tight',
    gap: 'gap-1.5',
  },
};

export function SeatStudentBadge({
  name,
  photoUrl,
  size = 'md',
  showName = true,
  className = '',
}: SeatStudentBadgeProps) {
  const displayName = formatDisplayName(name);
  const colors = studentNameColor(displayName);
  const initials = studentInitials(displayName);
  const s = sizeMap[size];

  return (
    <div className={`flex flex-col items-center ${s.gap} ${className}`}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className={`${s.avatar} shrink-0 rounded-full object-cover ring-offset-1 ring-offset-[#0f172a] ${colors.ring}`}
        />
      ) : (
        <div
          className={`${s.avatar} flex shrink-0 items-center justify-center rounded-full font-bold ring-offset-1 ring-offset-[#0f172a] ${colors.bg} ${colors.initials} ${colors.ring}`}
        >
          {initials}
        </div>
      )}
      {showName ? (
        <p className={`max-w-full truncate px-0.5 text-center font-semibold ${s.name} ${colors.name}`}>
          {displayName}
        </p>
      ) : null}
    </div>
  );
}
