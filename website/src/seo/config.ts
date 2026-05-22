/** Canonical site URL — always use www for SEO consistency. */
export const SITE_URL = 'https://www.smartlibdesk.in';

export const SITE_NAME = 'SmartLibDesk';

export const DEFAULT_DESCRIPTION =
  'SmartLibDesk is a modern library management system for schools, colleges, coaching institutes, and libraries.';

export const DEFAULT_KEYWORDS = [
  'library management software',
  'study hall management',
  'library attendance system',
  'seat allocation software',
  'coaching institute library',
  'SmartLibDesk',
  'India library software',
  'QR attendance library',
].join(', ');

export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  noIndex?: boolean;
};

const page = (title: string, description: string, path: string, keywords?: string): PageSeo => ({
  title: `${title} | ${SITE_NAME}`,
  description,
  path,
  keywords,
});

/** Public marketing routes indexed by search engines. */
export const PUBLIC_SEO_ROUTES: PageSeo[] = [
  page(
    'Library Management Software for Study Halls & Institutes',
    DEFAULT_DESCRIPTION,
    '/',
    DEFAULT_KEYWORDS,
  ),
  page(
    'About Us',
    'Learn about SmartLibDesk — reliable, private, and simple library management for study halls, schools, and coaching centers across India.',
    '/about',
  ),
  page(
    'Contact',
    'Contact SmartLibDesk for demos, support, and library onboarding. We help study halls and institutes go digital.',
    '/contact',
  ),
  page(
    'Courses & Services',
    'Explore SmartLibDesk features: student management, QR attendance, seat allocation, notifications, Razorpay billing, and reports.',
    '/courses',
  ),
  page(
    'Privacy Policy',
    'SmartLibDesk privacy policy — how we collect, use, and protect library and student data.',
    '/privacy-policy',
  ),
  page(
    'Refund Policy',
    'SmartLibDesk refund policy for library subscription plans paid via Razorpay.',
    '/refund-policy',
  ),
  page(
    'Terms & Conditions',
    'Terms and conditions for using SmartLibDesk library management software and related services.',
    '/terms',
  ),
];

/** App auth pages — noindex, excluded from sitemap. */
export const PRIVATE_SEO_ROUTES: PageSeo[] = [
  page(
    'Log in',
    'Sign in to your SmartLibDesk library owner or student account.',
    '/login',
  ),
  page(
    'Register your library',
    'Create a SmartLibDesk library account — verify email, set location, and start managing students.',
    '/register',
  ),
];

/** Linked from nav but not listed in the marketing sitemap. */
export const EXTRA_SEO_ROUTES: PageSeo[] = [
  page(
    'Services',
    'SmartLibDesk services: student management, QR attendance, seats, notifications, Razorpay subscriptions, and dashboards.',
    '/services',
  ),
  page(
    'Pricing',
    'Affordable SmartLibDesk plans for libraries — trial, monthly, 6-month, and yearly subscriptions via Razorpay.',
    '/pricing',
  ),
  page(
    'Download app',
    'Download the SmartLibDesk Android app for library management, attendance, seats, and Razorpay payments.',
    '/download',
  ),
];

export const SEO_BY_PATH = Object.fromEntries(
  [...PUBLIC_SEO_ROUTES, ...EXTRA_SEO_ROUTES, ...PRIVATE_SEO_ROUTES].map((r) => [r.path, r]),
) as Record<string, PageSeo>;

export const DEFAULT_PAGE_SEO = SEO_BY_PATH['/']!;

/** Paths included in sitemap.xml (generated at build). */
export const SITEMAP_PATHS = PUBLIC_SEO_ROUTES.map((r) => r.path);

/** Paths blocked in robots.txt and marked noindex in meta. */
export const NOINDEX_PATH_PREFIXES = [
  '/admin',
  '/superadmin',
  '/dashboard',
  '/login',
  '/register',
] as const;

export function isNoIndexPath(pathname: string): boolean {
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
