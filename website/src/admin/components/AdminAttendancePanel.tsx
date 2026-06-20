type DayPoint = { label: string; value: number };

type AdminAttendancePanelProps = {
  present: number;
  absent: number;
  ratePct: number;
  weekTrend: DayPoint[];
};

export function AdminAttendancePanel({ present, absent, ratePct, weekTrend }: AdminAttendancePanelProps) {
  const max = Math.max(...weekTrend.map((d) => d.value), 1);

  return (
    <section className="admin-panel admin-card h-full rounded-2xl p-4 sm:p-5">
      <h2 className="font-display text-base font-bold text-white">Today&apos;s Attendance</h2>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-center">
          <p className="text-xs font-medium text-white/70">Present</p>
          <p className="mt-1 text-2xl font-bold text-white">{present}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-center">
          <p className="text-xs font-medium text-white/70">Absent</p>
          <p className="mt-1 text-2xl font-bold text-white">{absent}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-center">
          <p className="text-xs font-medium text-white/70">Rate</p>
          <p className="mt-1 text-2xl font-bold text-white">{ratePct}%</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center">
        <div
          className="relative flex h-28 w-28 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-primary) 0 ${ratePct}%, rgba(255,255,255,0.12) ${ratePct}% 100%)`,
          }}
        >
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border border-white/15 bg-[#0f172a] text-center shadow-inner">
            <span className="text-lg font-bold text-white">{ratePct}%</span>
            <span className="text-[10px] text-white/60">Present</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Weekly attendance trend</p>
        <div className="mt-3 flex h-24 items-end justify-between gap-1.5">
          {weekTrend.map((day) => (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-[2rem] rounded-t-lg bg-gradient-to-t from-primary to-accent transition-all"
                style={{ height: `${Math.max(8, (day.value / max) * 100)}%` }}
                title={`${day.value} check-ins`}
              />
              <span className="text-[10px] font-medium text-muted">{day.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
