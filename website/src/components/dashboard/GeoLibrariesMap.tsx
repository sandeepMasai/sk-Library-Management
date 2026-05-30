import type { SuperAdminLibrary } from '../../superadmin/api/superadminApi';

type GeoLibrariesMapProps = {
  libraries: SuperAdminLibrary[];
  total: number;
};

const cityCoords: Record<string, { x: number; y: number }> = {
  delhi: { x: 42, y: 28 },
  mumbai: { x: 28, y: 62 },
  bangalore: { x: 38, y: 78 },
  bengaluru: { x: 38, y: 78 },
  chennai: { x: 44, y: 82 },
  hyderabad: { x: 40, y: 68 },
  kolkata: { x: 58, y: 42 },
  pune: { x: 30, y: 58 },
  jaipur: { x: 34, y: 32 },
  alwar: { x: 36, y: 30 },
  ahmedabad: { x: 24, y: 48 },
  lucknow: { x: 46, y: 34 },
};

function coordsForLibrary(lib: SuperAdminLibrary, index: number) {
  const key = (lib.city || '').trim().toLowerCase();
  if (cityCoords[key]) return cityCoords[key];
  const angle = (index * 2.4) % (Math.PI * 2);
  const r = 18 + (index % 5) * 4;
  return { x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r * 0.7 };
}

export function GeoLibrariesMap({ libraries, total }: GeoLibrariesMapProps) {
  const dots = libraries.slice(0, 12);

  return (
    <div className="glass-panel-dark rounded-2xl border border-white/10 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Global Library Network</h2>
          <p className="mt-0.5 text-sm text-slate-400">{total.toLocaleString('en-IN')} libraries on platform</p>
        </div>
        <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">Live</span>
      </div>

      <div className="relative mt-4 h-52 overflow-hidden rounded-xl border border-white/10 bg-[#060d18] sm:h-60">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_70%)]" />
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <ellipse cx="50" cy="52" rx="38" ry="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          <ellipse cx="50" cy="52" rx="28" ry="32" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          <ellipse cx="50" cy="52" rx="18" ry="22" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          {dots.map((lib, i) => {
            const { x, y } = coordsForLibrary(lib, i);
            return (
              <g key={lib.id}>
                <circle cx={x} cy={y} r="4" fill="rgba(34,211,238,0.15)" className="animate-map-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                <circle cx={x} cy={y} r="1.8" fill="#22d3ee" className="animate-map-pulse" style={{ animationDelay: `${i * 0.3}s`, filter: 'drop-shadow(0 0 4px #22d3ee)' }} />
              </g>
            );
          })}
        </svg>
        <p className="absolute bottom-3 left-3 text-[10px] uppercase tracking-widest text-slate-600">India · Remote</p>
      </div>
    </div>
  );
}
