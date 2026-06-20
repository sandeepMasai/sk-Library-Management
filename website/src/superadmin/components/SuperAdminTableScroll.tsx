import type { ReactNode } from 'react';

export function SuperAdminTableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm">
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div className="min-w-[640px] text-white [&_table]:w-full [&_tbody_td]:border-b [&_tbody_td]:border-white/10 [&_tbody_td]:px-4 [&_tbody_td]:py-3 [&_tbody_td]:text-sm [&_tbody_td]:text-white/90 [&_thead]:bg-white/10 [&_th]:border-b [&_th]:border-white/15 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-white/70 [&_tr:last-child_td]:border-0">
          {children}
        </div>
      </div>
    </div>
  );
}
