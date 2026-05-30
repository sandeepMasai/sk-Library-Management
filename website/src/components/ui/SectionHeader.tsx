type SectionHeaderProps = {
  emoji?: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
  align?: 'center' | 'left';
  className?: string;
};

export function SectionHeader({
  emoji,
  title,
  subtitle,
  dark = false,
  align = 'center',
  className = '',
}: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={`${alignClass} ${className}`}>
      {emoji ? (
        <p className={`mb-2 text-sm font-semibold tracking-wide ${dark ? 'text-teal-300' : 'text-primary'}`}>
          {emoji}
        </p>
      ) : null}
      <h2
        className={`font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl ${
          dark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={`mx-auto mt-3 max-w-2xl text-base sm:text-lg ${
            dark ? 'text-white/75' : 'text-muted'
          } ${align === 'center' ? '' : 'mx-0'}`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
