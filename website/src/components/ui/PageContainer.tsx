import type { ReactNode } from 'react';

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  size?: 'md' | 'lg' | 'sm';
};

const sizes = {
  sm: 'max-w-xl',
  md: 'max-w-3xl',
  lg: 'max-w-6xl',
};

export function PageContainer({ children, className = '', size = 'lg' }: PageContainerProps) {
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 ${sizes[size]} ${className}`}>{children}</div>
  );
}
