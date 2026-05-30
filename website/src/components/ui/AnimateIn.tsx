import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

type AnimateInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Run once when element enters viewport */
  once?: boolean;
  /** Initial animation on mount (hero) vs scroll-triggered */
  immediate?: boolean;
};

export function AnimateIn({
  children,
  className = '',
  delay = 0,
  once = true,
  immediate = false,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (immediate) {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          if (once) observer.disconnect();
        } else if (!once) {
          el.classList.remove('is-visible');
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate, once]);

  const style = delay ? ({ ['--reveal-delay' as string]: `${delay}ms` } as CSSProperties) : undefined;

  return (
    <div ref={ref} className={`reveal-on-scroll ${className}`} style={style}>
      {children}
    </div>
  );
}
