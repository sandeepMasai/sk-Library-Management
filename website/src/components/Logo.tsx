import { Link } from 'react-router-dom';
import { SITE } from '../content/site';

type LogoProps = {
  /** Show "SmartLibDesk" text beside the mark */
  showName?: boolean;
  /** Link to home (default true). Set false inside another Link. */
  linkToHome?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Light text for dark backgrounds (admin sidebar) */
  variant?: 'default' | 'light';
};

const sizes = {
  sm: { img: 'h-8 w-8', text: 'text-base' },
  md: { img: 'h-10 w-10', text: 'text-lg' },
  lg: { img: 'h-14 w-14', text: 'text-xl' },
};

export function Logo({
  showName = true,
  linkToHome = true,
  size = 'md',
  className = '',
  variant = 'default',
}: LogoProps) {
  const s = sizes[size];
  const nameClass =
    variant === 'light'
      ? `font-bold tracking-tight text-white ${s.text}`
      : `font-bold tracking-tight text-primary ${s.text}`;

  const inner = (
    <>
      <img
        src="/logo.png"
        alt={`${SITE.name} logo`}
        className={`${s.img} shrink-0 rounded-xl object-contain`}
      />
      {showName ? <span className={nameClass}>{SITE.name}</span> : null}
    </>
  );

  const wrapClass = `inline-flex items-center gap-2.5 ${className}`;

  if (linkToHome) {
    return (
      <Link to="/" className={wrapClass}>
        {inner}
      </Link>
    );
  }

  return <span className={wrapClass}>{inner}</span>;
}
