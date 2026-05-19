import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from './config';
import { SITE } from '../content/site';

export function buildStructuredData(pathname: string): object {
  const pageUrl = `${SITE_URL}${pathname === '/' ? '' : pathname}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        email: SITE.supportEmail,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'IN',
          addressLocality: SITE.address,
        },
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en-IN',
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#educational-service` },
      },
      {
        '@type': 'Service',
        '@id': `${SITE_URL}/#educational-service`,
        name: `${SITE_NAME} Library Management`,
        serviceType: 'Educational library management software',
        description: DEFAULT_DESCRIPTION,
        provider: { '@id': `${SITE_URL}/#organization` },
        areaServed: {
          '@type': 'Country',
          name: 'India',
        },
        audience: {
          '@type': 'EducationalAudience',
          educationalRole: ['library administrator', 'student', 'institution'],
        },
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}/pricing`,
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  };
}
