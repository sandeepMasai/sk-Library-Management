import { useEffect } from 'react';
import {
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  DEFAULT_PAGE_SEO,
  SEO_BY_PATH,
  SITE_NAME,
  SITE_URL,
  isNoIndexPath,
  type PageSeo,
} from './config';
import { buildStructuredData } from './structuredData';
import { setJsonLd, setLink, setMeta } from './dom';

type SeoInput = Partial<PageSeo>;

function resolveSeo(pathname: string, overrides?: SeoInput): PageSeo {
  const known = SEO_BY_PATH[pathname];
  const base =
    known ??
    ({
      title: `Page not found | ${SITE_NAME}`,
      description: DEFAULT_PAGE_SEO.description,
      path: pathname,
      noIndex: true,
    } satisfies PageSeo);
  const noIndex = overrides?.noIndex ?? base.noIndex ?? isNoIndexPath(pathname);
  return {
    ...base,
    ...overrides,
    path: overrides?.path ?? pathname,
    noIndex,
  };
}

export function usePageSeo(pathname: string, overrides?: SeoInput) {
  const seo = resolveSeo(pathname, overrides);

  useEffect(() => {
    const canonical = `${SITE_URL}${seo.path === '/' ? '' : seo.path}`;
    const robots = seo.noIndex ? 'noindex, nofollow' : 'index, follow';
    const keywords = seo.keywords ?? DEFAULT_KEYWORDS;

    document.title = seo.title;

    setMeta('name', 'description', seo.description);
    setMeta('name', 'keywords', keywords);
    setMeta('name', 'robots', robots);
    setLink('canonical', canonical);

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'en_IN');
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:title', seo.title);
    setMeta('property', 'og:description', seo.description);
    setMeta('property', 'og:image', DEFAULT_OG_IMAGE);

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', seo.title);
    setMeta('name', 'twitter:description', seo.description);
    setMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);

    setJsonLd(buildStructuredData(seo.path));
  }, [seo.description, seo.keywords, seo.noIndex, seo.path, seo.title]);
}
