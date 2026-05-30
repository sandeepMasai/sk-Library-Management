import { MARQUEE_ITEMS } from '../../content/site';

type MarqueeTickerProps = {
  items?: readonly string[];
  className?: string;
};

export function MarqueeTicker({ items = MARQUEE_ITEMS, className = '' }: MarqueeTickerProps) {
  const row = [...items, ...items];

  return (
    <div
      className={`overflow-hidden border-y border-white/10 bg-[#0b1220]/80 py-4 ${className}`}
      aria-hidden
    >
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="text-sm font-bold tracking-[0.2em] text-white/40 sm:text-base"
          >
            {item}
            <span className="mx-4 text-primary/60">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
