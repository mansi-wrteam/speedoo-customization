const fs = require('fs');
const { loadEnvConfig } = require('@next/env');

// The same loader `next build` uses, so .env.production / .env.local are read
// in the same order. Plain dotenv only read `.env`, so a server keeping its
// values in .env.production got a service worker configured with "undefined".
loadEnvConfig(process.cwd());

// src/pages/<route>(/index).<ext>  ->  <route>   ("" for the home page)
const toRoute = (file) =>
  file
    .replace(/^src\/pages\//, '')
    .replace(/\.(js|jsx|ts|tsx|mdx)$/, '')
    .replace(/(^|\/)index$/, '');

// Not for search engines: dynamic routes (they would be listed literally as
// [slug] — their real URLs are enumerated from the API below instead), the 404
// page, and pages that need a login or are part of checkout (they redirect
// guests home).
const NOT_LISTED = /^(404|cart|checkout|web-payment-status|order-detail|profile)(\/|$)/;
const isListed = (route) => !route.includes('[') && !NOT_LISTED.test(route);

const addPage = (cleanRoute) => {
  return `  <url>
    <loc>${`${process.env.NEXT_PUBLIC_BASE_URL}/${cleanRoute}`}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`;
};

// Products, blogs and categories are dynamic routes, so the file scan above can
// only see `[slug]`. Their real URLs are pulled from the API at build time.
//
// Without this the catalogue was advertised nowhere: combined with the listing
// pages using click handlers instead of links (now fixed), a crawler had no way
// to reach a single product, post or category.
//
// A failure here must not break the build — it degrades to the static-only
// sitemap, which is what shipped before.
const API = `${process.env.NEXT_PUBLIC_API_URL}${process.env.NEXT_PUBLIC_API_SUBURL}`;
const ACCESS_KEY = '903361';

const fetchJson = async (url, init = {}) => {
  const res = await fetch(url, {
    ...init,
    headers: { 'x-access-key': ACCESS_KEY, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const slugsFrom = (body) =>
  String(body?.status) === '1' && Array.isArray(body?.data)
    ? body.data.map((row) => row?.slug).filter(Boolean)
    : [];

// The products endpoint is city-scoped and answers with nothing when it gets no
// coordinates, so the default city has to be resolved first — exactly what the
// app does on a first visit (Header reads settings.default_city).
const fetchDefaultCityCoords = async () => {
  try {
    const body = await fetchJson(`${API}/settings?is_web_setting=1`);
    const settings = JSON.parse(Buffer.from(body.data, 'base64').toString('utf8'));
    const city = settings?.default_city;
    if (city?.latitude && city?.longitude) {
      return { latitude: String(city.latitude), longitude: String(city.longitude) };
    }
  } catch (error) {
    console.warn(`sitemap: could not resolve the default city — ${error.message}`);
  }
  return null;
};

/**
 * Every enabled module id.
 *
 * The catalogue endpoints are module-scoped through `X-Module-Id`, and a request
 * without that header is answered as module 1. So a sitemap built with no header
 * listed only the first module's catalogue: 315 products out of 1,110 across
 * four modules, leaving 72% of the shop invisible to search engines.
 *
 * The URLs stay bare — `/product/<slug>`, no `?module=` — because the server now
 * finds a deep-linked product in whichever module owns it (see `inAnyModule` in
 * src/server/pageData.ts). That keeps one canonical URL per product instead of
 * one per module, which is what we want indexed.
 */
const fetchModuleIds = async () => {
  try {
    const body = await fetchJson(`${API}/modules`);
    const ids = String(body?.status) === '1' && Array.isArray(body?.data)
      ? body.data.map((m) => m?.id).filter((id) => id != null)
      : [];
    return ids.length ? ids : [null];
  } catch (error) {
    console.warn(`sitemap: could not list modules — ${error.message}`);
    return [null];
  }
};

/** Runs `load` once per module and merges the slugs, de-duplicated. */
const acrossModules = async (moduleIds, load) => {
  const all = new Set();
  for (const moduleId of moduleIds) {
    try {
      for (const slug of slugsFrom(await load(moduleId))) all.add(slug);
    } catch (error) {
      console.warn(`sitemap: module ${moduleId} failed — ${error.message}`);
    }
  }
  return [...all];
};

const fetchDynamicRoutes = async () => {
  const coords = await fetchDefaultCityCoords();
  const moduleIds = await fetchModuleIds();
  const headers = (moduleId) => (moduleId == null ? {} : { 'X-Module-Id': String(moduleId) });
  const sources = [
    // `products` is a POST with multipart body, not a GET — a GET answers 405.
    {
      prefix: 'product',
      load: (moduleId) => {
        const form = new FormData();
        form.append('limit', '5000');
        form.append('offset', '0');
        if (coords) {
          form.append('latitude', coords.latitude);
          form.append('longitude', coords.longitude);
        }
        return fetchJson(`${API}/products`, { method: 'POST', body: form, headers: headers(moduleId) });
      },
    },
    // Blogs are not module-scoped, so one pass is enough.
    { prefix: 'blog', perModule: false, load: () => fetchJson(`${API}/blogs?limit=5000&offset=0`) },
    {
      prefix: 'categories',
      load: (moduleId) =>
        fetchJson(`${API}/categories?limit=5000&offset=0`, { headers: headers(moduleId) }),
    },
  ];

  const results = await Promise.all(
    sources.map(async ({ prefix, load, perModule = true }) => {
      try {
        const slugs = perModule
          ? await acrossModules(moduleIds, load)
          : slugsFrom(await load(null));
        console.log(`sitemap: ${slugs.length} ${prefix} URLs`);
        return slugs.map((slug) => `${prefix}/${slug}`);
      } catch (error) {
        // Loud, because a silently short sitemap looks like success.
        console.warn(`sitemap: could not list ${prefix} URLs — ${error.message}`);
        return [];
      }
    }),
  );
  return results.flat();
};

const generateSitemap = async () => {
  const { globby } = await import('globby');

  // excludes Next.js files and API routes
  const pages = await globby([
    'src/pages/**/*{.js,.jsx,.ts,.tsx,.mdx}',
    '!src/pages/_*.js',
    '!src/pages/api',
    '!src/pages/_*.jsx',
    '!src/pages/_*.ts',
    '!src/pages/_*.tsx',
  ]);

  const dynamicRoutes = await fetchDynamicRoutes();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${[...pages.map(toRoute).filter(isListed), ...dynamicRoutes].sort().map(addPage).join('\n')}
  </urlset>`;
  fs.writeFileSync('public/sitemap.xml', sitemap);
  console.log(`sitemap: ${pages.map(toRoute).filter(isListed).length} static + ${dynamicRoutes.length} dynamic URLs`);

  // robots.txt did not exist, so nothing advertised the sitemap. Written here
  // rather than committed by hand so the host always matches NEXT_PUBLIC_BASE_URL.
  fs.writeFileSync(
    'public/robots.txt',
    [
      'User-agent: *',
      // Private areas: these redirect guests away and must not be crawled.
      'Disallow: /cart',
      'Disallow: /checkout',
      'Disallow: /profile',
      'Disallow: /order-detail',
      'Disallow: /web-payment-status',
      '',
      `Sitemap: ${process.env.NEXT_PUBLIC_BASE_URL}/sitemap.xml`,
      '',
    ].join('\n'),
  );
  console.log('robots.txt written');
};

// Firebase's own names for the config keys, and the placeholder each one
// replaces in templates/firebase-messaging-template.js.
const FIREBASE_KEYS = [
  ['apiKey', 'FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY'],
  ['authDomain', 'FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  ['projectId', 'FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  ['storageBucket', 'FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  ['messagingSenderId', 'FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  ['appId', 'FIREBASE_APP_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'],
  ['measurementId', 'FIREBASE_MEASUREMENT_ID', 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'],
];
// Messaging cannot start without these; the others are optional.
const FIREBASE_REQUIRED = ['apiKey', 'projectId', 'messagingSenderId', 'appId'];

// Without a usable config the browser still requests this file, so it gets a
// worker that does nothing rather than a 404 or a Firebase init error.
const NOOP_WORKER = `// Push notifications are off: the NEXT_PUBLIC_FIREBASE_* values were not set
// when this site was built. Generated by scripts/generator.js.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
`;

const generateMessagingWorker = () => {
  const value = (envName) => (process.env[envName] || '').trim();
  const missing = FIREBASE_KEYS
    .filter(([key, , envName]) => FIREBASE_REQUIRED.includes(key) && !value(envName))
    .map(([, , envName]) => envName);

  if (missing.length) {
    console.warn(`firebase-messaging-sw.js: push disabled, missing ${missing.join(', ')}`);
    fs.writeFileSync('./public/firebase-messaging-sw.js', NOOP_WORKER);
    return;
  }

  // Each placeholder sits inside quotes in the template; replace the quoted
  // token with a JSON literal so a value can never break out of its string.
  let worker = fs.readFileSync('./templates/firebase-messaging-template.js', 'utf-8');
  for (const [, placeholder, envName] of FIREBASE_KEYS) {
    const literal = value(envName) ? JSON.stringify(value(envName)) : 'undefined';
    worker = worker.split(`"${placeholder}"`).join(literal);
  }
  fs.writeFileSync('./public/firebase-messaging-sw.js', worker);
  console.log('firebase-messaging-sw.js written');
};

// The worker goes first and on its own: it used to be written after the
// sitemap's API calls, so any failure there left the build without it.
// A worker failure fails the build; a sitemap failure only warns, because a
// short sitemap is still a working site.
try {
  generateMessagingWorker();
} catch (error) {
  console.error('firebase-messaging-sw.js: could not be generated', error);
  process.exit(1);
}

generateSitemap().catch((error) => {
  console.warn(`sitemap: generation failed, keeping the previous files — ${error.message}`);
});
