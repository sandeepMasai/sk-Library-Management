import type { ReactNode } from 'react';

export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl border border-slate-200/80">
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div className="min-w-[640px] [&_table]:w-full [&_thead]:bg-slate-50/90 [&_th]:border-b [&_th]:border-slate-200 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-4 [&_td]:py-3 [&_td]:text-sm [&_tr:last-child_td]:border-0">
          {children}
        </div>
      </div>
    </div>
  );
}
