# SmartLibDesk SEO & deployment guide

Production site: **https://www.smartlibdesk.in**

## Folder structure (SEO-related)

```
website/
├── index.html                 # Default meta, OG, Twitter, canonical, favicons
├── vercel.json                # SPA rewrites, www redirect, cache & security headers
├── vite.config.ts             # Build chunks for faster loads
├── package.json               # prebuild → sitemap generation
├── public/
│   ├── robots.txt
│   ├── sitemap.xml            # Generated on build (do not edit by hand)
│   ├── site.webmanifest       # PWA manifest
│   ├── favicon.svg
│   ├── favicon.png
│   └── logo.png
├── scripts/
│   └── generate-sitemap.mjs   # Writes public/sitemap.xml before Vite build
└── src/
    └── seo/
        ├── config.ts          # Per-route titles, keywords, sitemap paths
        ├── Seo.tsx            # Route-aware meta component
        ├── usePageSeo.ts      # Updates title, meta, canonical, JSON-LD
        ├── dom.ts             # DOM helpers for meta/link/script tags
        └── structuredData.ts  # JSON-LD Organization, WebSite, Service
```

## Install

```bash
cd website
npm install
```

Uses a lightweight `usePageSeo` hook (React 19–compatible) to update document meta on each route without duplicate tags.

## Local dev

```bash
npm run dev
```

## Build (generates sitemap + production bundle)

```bash
npm run build
npm run preview
```

`prebuild` runs `scripts/generate-sitemap.mjs` so `public/sitemap.xml` is copied into `dist/`.

## Deploy to Vercel

1. **Project root directory:** `website`
2. **Environment variable:** `VITE_API_URL` = your Railway API URL
3. **Domains:** `www.smartlibdesk.in` (primary) and `smartlibdesk.in` (redirects to www via `vercel.json`)

```bash
cd website
npx vercel --prod
```

Or push to GitHub with Vercel connected (see `VERCEL.md`).

## What was configured

| Item | Implementation |
|------|----------------|
| Meta tags | `index.html` defaults + `Seo` component per route |
| Open Graph / Twitter | Absolute image URLs on `www.smartlibdesk.in` |
| Canonical | `https://www.smartlibdesk.in` + path |
| `robots.txt` | Allow `/`, disallow admin/auth, sitemap URL |
| `sitemap.xml` | Auto-generated for 7 marketing routes |
| Dynamic SEO | `usePageSeo` in `Layout` |
| JSON-LD | Organization, WebSite, WebPage, Educational Service |
| SPA 404 on refresh | `vercel.json` rewrites to `index.html` |
| Performance | Vendor chunk split, long-cache static assets |
| PWA basics | `site.webmanifest`, icons, theme-color |

### Indexed routes (sitemap)

- `/`
- `/about`
- `/contact`
- `/courses` (same content as `/services`; both work)
- `/privacy-policy`
- `/refund-policy`
- `/terms`

Also available (not in sitemap): `/services`, `/pricing`, `/login`, `/register`.

## Google Search Console verification

1. Open [Google Search Console](https://search.google.com/search-console).
2. **Add property** → URL prefix: `https://www.smartlibdesk.in`
3. Verify ownership (HTML file upload, DNS TXT, or meta tag — Vercel DNS is easiest if domain is on Vercel).
4. **Sitemaps** → Submit: `https://www.smartlibdesk.in/sitemap.xml`
5. **URL inspection** → Test live URLs:
   - `https://www.smartlibdesk.in/`
   - `https://www.smartlibdesk.in/about`
   - `https://www.smartlibdesk.in/contact`
6. Request indexing for key pages after first deploy.

### Manual checks

```bash
curl -sI https://www.smartlibdesk.in/ | head -5
curl -sI https://www.smartlibdesk.in/about | head -5
curl -s https://www.smartlibdesk.in/robots.txt
curl -s https://www.smartlibdesk.in/sitemap.xml
```

- Home and inner routes should return **HTTP 200** (not 404).
- Refresh `/about` in the browser — page should load (SPA rewrite).
- View source / DevTools → `<title>`, `canonical`, and `application/ld+json` update per route.

### Rich results

Test structured data: [Rich Results Test](https://search.google.com/test/rich-results) with `https://www.smartlibdesk.in`.

## Updating SEO copy

Edit `src/seo/config.ts` for route titles/descriptions. Keep `scripts/generate-sitemap.mjs` `PATHS` in sync with `SITEMAP_PATHS` in config when adding marketing pages.
