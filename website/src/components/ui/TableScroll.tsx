import type { ReactNode } from 'react';

export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <div className="min-w-[640px]">{children}</div>
    </div>
  );
}
