// Asks the one question the route table cannot: does the server actually send
// the page content, with no JavaScript involved?
//
// SSR_PLAN.md §7.3. Today the server sends correct <head> tags and an empty
// body, because every public page loads its content through
// `dynamic(..., { ssr: false })`. A crawler that does not run JavaScript sees
// nothing. "SSR is configured" and "SSR works" are different claims, and only
// the second one matters.
//
// So the checks are split in two:
//
//   HEAD  — what already works today. Must stay green in every phase; a break
//           here is a regression in the SEO work that already shipped.
//   BODY  — what SSR_PLAN.md phases 3 to 6 are for. Expected to FAIL until then.
//           That failure is the point of writing this script in phase 0: it is
//           the definition of done, written before the work, so a broken
//           implementation cannot look finished.
//
// Plus a LEAK check: nothing user-specific may appear in server HTML
// (SSR_PLAN.md constraint 5).
//
// Usage:
//   node scripts/check-ssr-content.mjs http://127.0.0.1:8011
//   node scripts/check-ssr-content.mjs http://127.0.0.1:8011 --section=head
//   node scripts/check-ssr-content.mjs http://127.0.0.1:8011 --verbose
//
// Exit 0 = every selected section passed. 1 = a check failed. 2 = bad usage.
//
// The body assertions are deliberately markup-agnostic. They count links by
// ROUTE (`href="/product/…"`) and measure visible text, rather than matching
// class names or test ids, because routes are a hard constraint of the project
// while class names are redesigned freely. A check that breaks every time a card
// is restyled would be turned off within a month.

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--"));
const sectionArg = (args.find((a) => a.startsWith("--section=")) || "--section=all").split("=")[1];
const verbose = args.includes("--verbose");

if (!base || !["all", "head", "body", "leak"].includes(sectionArg)) {
  console.error(
    "usage: node scripts/check-ssr-content.mjs <baseUrl> [--section=all|head|body|leak] [--verbose]",
  );
  process.exit(2);
}

// ── Helpers over raw HTML. No DOM, on purpose: this must see exactly the bytes
// a crawler gets, not a browser's repaired version of them.

/** Visible text: scripts, styles and tags removed. Excludes __NEXT_DATA__. */
const visibleText = (html) => {
  const body = html.slice(html.indexOf("<body"));
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/** How many links to a given route family the markup contains. */
const countLinks = (html, prefix) =>
  (html.match(new RegExp(`href="${prefix.replace(/\//g, "\\/")}[^"#]`, "g")) || []).length;

const nextData = (html) => {
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
};

// ── Check builders.

const headPresent = () => ({
  section: "head",
  label: "title and description are server-rendered and non-empty",
  run: (html) => {
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1]?.trim();
    const desc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/)?.[1]?.trim();
    if (!title) return "no <title>";
    if (!desc) return "no meta description";
    return null;
  },
});

const shellRendered = () => ({
  section: "body",
  label: "app shell is server-rendered (footer policy links present)",
  run: (html) =>
    countLinks(html, "/privacy-policy") > 0
      ? null
      : "no footer link found — Layout/Header/Footer did not render on the server",
});

const minText = (chars) => ({
  section: "body",
  label: `page has at least ${chars} characters of visible text`,
  run: (html) => {
    const len = visibleText(html).length;
    return len >= chars ? null : `only ${len} characters of visible text`;
  },
});

const minLinks = (prefix, n) => ({
  section: "body",
  label: `at least ${n} link(s) to ${prefix}…`,
  run: (html) => {
    const found = countLinks(html, prefix);
    return found >= n ? null : `found ${found}`;
  },
});

/** Either family of links is acceptable — used for the two category flows. */
const eitherLinks = (a, b, n) => ({
  section: "body",
  label: `at least ${n} link(s) to ${a}… or ${b}…`,
  run: (html) => {
    const ca = countLinks(html, a);
    const cb = countLinks(html, b);
    if (ca >= n) return null;
    if (cb >= n) return null;
    return `found ${ca} to ${a} and ${cb} to ${b}`;
  },
  // Reported so the output says which of the two category flows was exercised.
  describe: (html) => {
    const ca = countLinks(html, a);
    const cb = countLinks(html, b);
    return ca >= cb ? `sub-category flow (${ca} links)` : `direct-listing flow (${cb} links)`;
  },
});

// Fields that must never appear in server HTML (SSR_PLAN.md constraint 5).
// Checked against __NEXT_DATA__, which is where props would leak.
const LEAK_KEYS = [
  "jwtToken",
  "jwt_token",
  "access_token",
  "refresh_token",
  "guestCart",
  "cartData",
  "addresses",
  "orderDetail",
  "walletBalance",
  "mobile",
  "fcmToken",
];

// The translation dictionary is a map of UI labels keyed by camelCase names, so
// it legitimately contains "mobile", "orderDetail" and "walletBalance" as KEYS
// with values like "Mobile :". Scanning it for those words reports a leak on
// every page and hides a real one in the noise, so it is skipped by path. Every
// other branch of props is still scanned.
const SKIP_SUBTREES = ["json_data"];

// `mobile` means two different things in this API. On the visitor it is personal
// data and must never be server-rendered (constraint 5). On a `seller` it is the
// shop's published contact number, which the product endpoint returns to every
// caller and which the client already receives today. Only the first is a leak,
// so matches directly under a `seller` are not flagged.
//
// It is still a CHANGE in exposure — those numbers now sit in indexable HTML
// rather than only in an XHR response — and that is recorded as D6 in
// SSR_PLAN.md §9a rather than silently accepted here.
const BUSINESS_CONTACT_PARENTS = ["seller", "vendor", "store"];

/** Walks props, skipping the translation dictionary, collecting matches. */
const scanForLeaks = (value, path = "props") => {
  if (value === null || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((v, i) => scanForLeaks(v, `${path}[${i}]`));
  const hits = [];
  for (const [key, child] of Object.entries(value)) {
    if (SKIP_SUBTREES.includes(key)) continue;
    const childPath = `${path}.${key}`;
    const parentKey = path.split(".").pop()?.replace(/\[\d+\]$/, "");
    const isBusinessContact = BUSINESS_CONTACT_PARENTS.includes(parentKey ?? "");
    if (LEAK_KEYS.includes(key) && !isBusinessContact) {
      hits.push(`${childPath} (${typeof child})`);
    }
    // A JWT is recognisable by shape wherever it hides.
    if (typeof child === "string" && /^eyJ[A-Za-z0-9_-]{10,}\./.test(child)) {
      hits.push(`${childPath} (looks like a JWT)`);
    }
    hits.push(...scanForLeaks(child, childPath));
  }
  return hits;
};

const noUserData = () => ({
  section: "leak",
  label: "__NEXT_DATA__ carries no user-specific field",
  run: (html) => {
    const data = nextData(html);
    if (!data) return null; // nothing to leak through
    const hits = scanForLeaks(data.props ?? {});
    return hits.length ? `found ${hits.join(", ")}` : null;
  },
});

// ── Routes. Slugs match migration-baseline/build/seo-pages.txt so this script
// and the recorded SEO baseline talk about the same pages.
const PRODUCT_SLUG = process.env.SSR_CHECK_PRODUCT_SLUG || "fresh-tomatoes";
const BLOG_SLUG =
  process.env.SSR_CHECK_BLOG_SLUG ||
  "reducing-food-waste-smart-buying-and-storage-strategies";
const CATEGORY_SLUG = process.env.SSR_CHECK_CATEGORY_SLUG || "fruits-vegetables";

const ROUTES = [
  { path: "/", checks: [minText(400), eitherLinks("/product/", "/categories/", 1)] },
  { path: "/products", checks: [minText(400), minLinks("/product/", 3)] },
  { path: `/product/${PRODUCT_SLUG}`, checks: [minText(400)] },
  // Link assertion restored: the tiles are real <a> again.
  { path: "/categories/all", checks: [minText(200), minLinks("/categories/", 3)] },
  {
    path: `/categories/${CATEGORY_SLUG}`,
    checks: [minText(200), eitherLinks("/categories/", "/product/", 1)],
  },
  // Link assertion restored: BlogCard is a real <a> again (was a button with
  // router.push, which no crawler follows). Keep this — it is what would catch a
  // regression back to a click handler.
  { path: "/blogs", checks: [minText(300), minLinks("/blog/", 2)] },
  { path: `/blog/${BLOG_SLUG}`, checks: [minText(600)] },
  { path: "/brands", checks: [minText(150)] },
  { path: "/sellers", checks: [minText(150)] },
  { path: "/countries", checks: [minText(150)] },
  { path: "/faqs", checks: [minText(200)] },
  { path: "/about-us", checks: [minText(200)] },
  { path: "/contact-us", checks: [minText(150)] },
  { path: "/privacy-policy", checks: [minText(200)] },
  { path: "/terms-and-conditions", checks: [minText(200)] },
  { path: "/shipping-policy", checks: [minText(200)] },
  { path: "/return-and-exchange-policy", checks: [minText(200)] },
  { path: "/cancellation-policy", checks: [minText(200)] },
];

// Every route also gets the universal checks.
for (const route of ROUTES) {
  route.checks = [headPresent(), shellRendered(), ...route.checks, noUserData()];
}

const wanted = (section) => sectionArg === "all" || sectionArg === section;

const tally = { head: { pass: 0, fail: 0 }, body: { pass: 0, fail: 0 }, leak: { pass: 0, fail: 0 } };
const failureLines = [];

for (const route of ROUTES) {
  const url = `${base}${route.path}`;
  let html;
  let status;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "ssr-content-check" } });
    status = res.status;
    html = await res.text();
  } catch (error) {
    failureLines.push(`${route.path}: request failed — ${error.message}`);
    for (const c of route.checks) if (wanted(c.section)) tally[c.section].fail += 1;
    continue;
  }

  if (status !== 200) {
    failureLines.push(`${route.path}: HTTP ${status}`);
    for (const c of route.checks) if (wanted(c.section)) tally[c.section].fail += 1;
    continue;
  }

  const notes = [];
  for (const check of route.checks) {
    if (!wanted(check.section)) continue;
    const problem = check.run(html);
    if (problem) {
      tally[check.section].fail += 1;
      failureLines.push(`${route.path} [${check.section}] ${check.label} — ${problem}`);
    } else {
      tally[check.section].pass += 1;
      if (check.describe) notes.push(check.describe(html));
    }
  }
  if (verbose || notes.length) {
    console.log(`${route.path}${notes.length ? `  (${notes.join("; ")})` : ""}`);
  }
}

console.log("");
for (const section of ["head", "body", "leak"]) {
  if (!wanted(section)) continue;
  const { pass, fail } = tally[section];
  console.log(`${section.toUpperCase().padEnd(5)} ${pass} passed, ${fail} failed`);
}

if (failureLines.length) {
  console.error(`\nfailures (${failureLines.length}):`);
  for (const line of failureLines) console.error(`  - ${line}`);
  if (tally.body.fail && !tally.head.fail && !tally.leak.fail) {
    console.error(
      `\nOnly BODY checks failed. That is the expected state until SSR_PLAN.md\n` +
        `phases 3-6 server-render the page bodies. Run with --section=head to gate\n` +
        `the phases before that.`,
    );
  }
  process.exit(1);
}

console.log(`\nall selected checks passed against ${base}`);
