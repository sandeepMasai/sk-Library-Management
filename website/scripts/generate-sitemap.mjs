import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://www.smartlibdesk.in';

/** Keep in sync with src/seo/config.ts SITEMAP_PATHS */
const PATHS = [
  '/',
  '/about',
  '/contact',
  '/download',
  '/courses',
  '/privacy-policy',
  '/refund-policy',
  '/terms',
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const today = new Date().toISOString().slice(0, 10);

const urls = PATHS.map((path) => {
  const loc = path === '/' ? SITE_URL : `${SITE_URL}${path}`;
  const priority = path === '/' ? '1.0' : path === '/courses' ? '0.9' : '0.8';
  const changefreq = path === '/' ? 'weekly' : 'monthly';
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

writeFileSync(join(publicDir, 'sitemap.xml'), xml, 'utf8');
console.log(`Generated sitemap.xml with ${PATHS.length} URLs → ${join(publicDir, 'sitemap.xml')}`);
