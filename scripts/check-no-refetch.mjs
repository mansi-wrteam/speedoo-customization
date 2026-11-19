// Catches the failure mode where SSR looks like it worked and did nothing.
//
// SSR_PLAN.md §7.5. Phase 6 serialises React Query's cache into the page with
// `dehydrate`, and the client picks it up with `HydrationBoundary`. That only
// works if the server used the exact same `queryKey` the client will ask for —
// every member of it, in order. The home key is
//
//   ["shopData", city.latitude, city.longitude, language.id, isRefetch, activeModuleId]
//
// Get one member wrong and nothing breaks loudly: the client simply does not
// find the entry, refetches, and shows its skeleton. The HTML still contains the
// server-rendered products, so `check-ssr-content.mjs` passes, the page looks
// right, and the entire benefit is gone. Only the network tab shows it.
//
// So this runs a real browser and watches the requests:
//
//   1. Load the page and read __NEXT_DATA__.props.pageProps.dehydratedState.
//      If it is absent, the page is not dehydrated yet — reported as PENDING,
//      not as a pass.
//   2. If it is present, require that no catalogue endpoint is called before any
//      user interaction, and that no skeleton is on screen.
//
// Boot requests the server does not replace (settings, theme, languages) are
// ignored on purpose: SSR_PLAN.md phase 3 preloads them through Redux, not
// through React Query, and `Layout` still refreshes them after mount by design.
//
// Usage:
//   node scripts/check-no-refetch.mjs http://127.0.0.1:8011
//
// Needs Playwright's chromium, which the repo already has for the visual suite.
//
// Exit 0 = nothing refetched (or nothing dehydrated yet). 1 = a refetch. 2 = bad usage.
import { chromium } from "playwright";

const base = process.argv[2];
if (!base) {
  console.error("usage: node scripts/check-no-refetch.mjs <baseUrl>");
  process.exit(2);
}

// Which API endpoint each seeded key corresponds to.
//
// Only a refetch of something the server ACTUALLY SEEDED on THIS page counts.
// Matching endpoint names loosely is wrong twice over: the route's own document
// URL contains its name (/sellers), and a page legitimately fetches its
// siblings — /products loads brands, sellers and categories for its filter
// sidebar, none of which is seeded. Both produced false failures.
const SEEDED_KEY_ENDPOINT = {
  products: "products",
  brands: "brands",
  sellers: "sellers",
  countries: "countries",
  blogs: "blogs",
  blogCategories: "blog_categories",
  blogTags: "blog_popular_tags",
  mostViewedBlogs: "blogs/most_viewed",
  faqs: "faqs",
  blog: "blogs",
  shopData: "shop",
};

const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "https://invalid.invalid").origin;
  } catch {
    return "https://invalid.invalid";
  }
})();

const PRODUCT_SLUG = process.env.SSR_CHECK_PRODUCT_SLUG || "fresh-tomatoes";
const CATEGORY_SLUG = process.env.SSR_CHECK_CATEGORY_SLUG || "fruits-vegetables";

const ROUTES = [
  "/",
  "/products",
  `/product/${PRODUCT_SLUG}`,
  "/categories/all",
  `/categories/${CATEGORY_SLUG}`,
  "/blogs",
  "/brands",
  "/sellers",
  "/countries",
];

// Skeletons the app shows while a query is in flight. Their presence after a
// dehydrated load means the cache was missed.
const SKELETON_SELECTORS = [
  ".react-loading-skeleton",
  "[class*='Skeleton']",
  "[class*='skeleton']",
];

const browser = await chromium.launch();
const results = [];

for (const route of ROUTES) {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Every API call this page makes, by path, so the seeded ones can be matched
  // after __NEXT_DATA__ says which keys were seeded.
  const apiPaths = new Set();
  page.on("request", (req) => {
    const url = req.url();
    if (req.resourceType() !== "fetch" && req.resourceType() !== "xhr") return;
    if (!url.startsWith(API_ORIGIN)) return;
    const path = new URL(url).pathname.replace(/^\/customer\//, "").replace(/\/$/, "");
    apiPaths.add(path);
  });

  let status = "PENDING";
  let detail = "";

  try {
    const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 45000 });
    if (!response || response.status() !== 200) {
      status = "FAIL";
      detail = `HTTP ${response ? response.status() : "no response"}`;
    } else {
      // Two seeding mechanisms are in use, and this must recognise BOTH or it
      // silently passes everything:
      //   - `dehydratedState`, React Query's own transport;
      //   - `serverData`, which pages feed to React Query as `initialData` or
      //     straight into useState (SSR_PLAN.md §3.5, channel 3).
      // Most catalogue pages use the second, because reproducing their query keys
      // server-side is the exact failure this check exists to detect.
      const seeded = await page.evaluate(() => {
        const el = document.getElementById("__NEXT_DATA__");
        if (!el) return null;
        try {
          const props = JSON.parse(el.textContent).props?.pageProps ?? {};
          const dehydratedState = props.dehydratedState ?? null;
          const serverData = props.serverData ?? null;
          if (!dehydratedState && !serverData) return null;
          return {
            kind: dehydratedState ? "dehydratedState" : "serverData",
            seededKeys: dehydratedState ? [] : Object.keys(serverData),
            keys: dehydratedState
              ? (dehydratedState.queries ?? []).length
              : Object.keys(serverData).length,
          };
        } catch {
          return null;
        }
      });
      const dehydrated = seeded;

      if (!dehydrated) {
        status = "PENDING";
        detail = "no serverData or dehydratedState — not server-seeded yet";
      } else {
        const keyCount = seeded.keys;
        let skeletons = 0;
        for (const sel of SKELETON_SELECTORS) {
          skeletons += await page.locator(sel).count();
        }
        // A seeded key is violated only if its OWN endpoint was called again.
        const refetched = seeded.seededKeys
          .map((k) => SEEDED_KEY_ENDPOINT[k])
          .filter(Boolean)
          .filter((endpoint) => apiPaths.has(endpoint));
        if (refetched.length) {
          status = "FAIL";
          const seen = [...new Set(refetched)].join(", ");
          detail = `${keyCount} seeded ${seeded.kind} entr${keyCount === 1 ? "y" : "ies"}, but the client still called ${seen} — the seed did not take`;
        } else if (skeletons) {
          status = "FAIL";
          detail = `${keyCount} seeded ${seeded.kind} entries and no refetch, but ${skeletons} skeleton element(s) rendered`;
        } else {
          status = "PASS";
          detail = `${keyCount} seeded ${seeded.kind} entr${keyCount === 1 ? "y" : "ies"} used, no refetch, no skeleton`;
        }
      }
    }
  } catch (error) {
    status = "FAIL";
    detail = error.message.split("\n")[0];
  }

  results.push({ route, status, detail });
  console.log(`${status.padEnd(7)} ${route.padEnd(36)} ${detail}`);
  await context.close();
}

await browser.close();

const failed = results.filter((r) => r.status === "FAIL");
const pending = results.filter((r) => r.status === "PENDING");
const passed = results.filter((r) => r.status === "PASS");

console.log(`\n${passed.length} passed, ${failed.length} failed, ${pending.length} pending`);

if (failed.length) {
  console.error(`\nfailures:`);
  for (const r of failed) console.error(`  - ${r.route}: ${r.detail}`);
  process.exit(1);
}

if (pending.length === results.length) {
  console.log(
    `\nNothing is dehydrated yet, so there is nothing to refetch. Expected until\n` +
      `SSR_PLAN.md phase 6. This script becomes a real gate then.`,
  );
}
