import { useLocation } from 'react-router-dom';
import { SITE_NAME, type PageSeo } from './config';
import { usePageSeo } from './usePageSeo';

type SeoProps = Partial<PageSeo>;

export function Seo(overrides?: SeoProps) {
  const { pathname } = useLocation();
  usePageSeo(pathname, overrides);
  return null;
}

/** SEO for routes outside the public Layout (login, admin, etc.). */
export function SeoNoIndex({ title }: { title: string }) {
  const { pathname } = useLocation();
  usePageSeo(pathname, {
    title: `${title} | ${SITE_NAME}`,
    noIndex: true,
  });
  return null;
}
