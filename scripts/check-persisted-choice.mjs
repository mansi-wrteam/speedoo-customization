// Does a server render destroy what the visitor chose?
//
// This is the check that would have caught two real bugs, and it exists because
// both were found by hand. The shape of them:
//
//   * `persistConfig` in src/redux/store.ts has NO whitelist, so EVERY slice is
//     persisted to localStorage.
//   * The server seeds its resolved shell state into the browser store so
//     hydration agrees (SSR_PLAN.md §3.5).
//   * localStorage is never sent with a request. So for anything the visitor can
//     CHOOSE, the server's fallback is wrong for a returning visitor — and
//     seeding it overwrites their real choice. redux-persist writes on every
//     change, so the choice is destroyed on disk too, not just on screen.
//
// Three choosable values are seeded: module, city, language. Each is cookie-backed
// so the server resolves the visitor's own value. This asserts that it stays put.
//
// The oracle is STATIC EXPORT. It has no seeding at all, so whatever it does is
// by definition "how the app behaved before SSR". Any divergence is a regression.
//
// usage: node scripts/check-persisted-choice.mjs <ssrUrl> <staticUrl>
//   e.g. node scripts/check-persisted-choice.mjs http://localhost:8001 http://127.0.0.1:8021
import { chromium } from "@playwright/test";

const [ssrUrl, staticUrl] = process.argv.slice(2);
if (!ssrUrl || !staticUrl) {
  console.error("usage: node scripts/check-persisted-choice.mjs <ssrUrl> <staticUrl>");
  process.exit(2);
}

/** Read one field out of a persisted slice. */
const persisted = async (page, sliceName, path) => {
  const raw = await page.evaluate(() => localStorage.getItem("persist:root"));
  if (!raw) return null;
  const slice = JSON.parse(JSON.parse(raw)[sliceName] || "{}");
  return path.split(".").reduce((o, k) => o?.[k], slice) ?? null;
};

/**
 * Each case: make a choice via the URL, then load a page that says NOTHING about
 * it — a bookmark, a typed address, a shared link. The choice must survive, and
 * survive a refresh.
 */
const CASES = [
  {
    name: "language",
    choose: "/?lang=ar",
    cold: "/products",
    read: (page) => persisted(page, "Language", "selectedLanguage.code"),
    also: async (page) => ({ htmlDir: await page.evaluate(() => document.documentElement.dir) }),
  },
  {
    name: "module",
    choose: "/?module=food-delivery&lang=en",
    cold: "/products?lang=en",
    read: (page) => persisted(page, "Module", "activeModuleId"),
  },
  {
    name: "city",
    choose: "/?lang=en",
    cold: "/blogs?lang=en",
    read: (page) => persisted(page, "City", "city.name"),
  },
  {
    name: "theme",
    // Not seeded, so it should be unaffected — pinned here so that stays true.
    choose: "/?lang=en",
    prepare: (page) => page.evaluate(() => localStorage.setItem("theme", "dark")),
    cold: "/products?lang=en",
    read: (page) => page.evaluate(() => (document.documentElement.className.includes("dark") ? "dark" : "light")),
  },
];

const observe = async (browser, baseUrl, testCase) => {
  // A fresh context per case: cookies and localStorage must not leak between them.
  const page = await (await browser.newContext()).newPage();
  const go = (path) => page.goto(baseUrl + path, { waitUntil: "networkidle" });
  try {
    await go(testCase.choose);
    if (testCase.prepare) {
      await testCase.prepare(page);
      // Reload so the choice is actually applied before it is read: next-themes
      // writes the class on mount, not when localStorage changes under it.
      await page.reload({ waitUntil: "networkidle" });
    }
    const chosen = await testCase.read(page);

    await go(testCase.cold);
    const afterCold = { value: await testCase.read(page), ...(await testCase.also?.(page)) };

    await page.reload({ waitUntil: "networkidle" });
    const afterRefresh = await testCase.read(page);

    return { chosen, afterCold, afterRefresh };
  } finally {
    await page.close();
  }
};

const browser = await chromium.launch();
let failed = 0;

console.log(`SSR    ${ssrUrl}`);
console.log(`STATIC ${staticUrl}  (the oracle: pre-SSR behaviour)\n`);

for (const testCase of CASES) {
  const [ssr, stat] = await Promise.all([
    observe(browser, ssrUrl, testCase),
    observe(browser, staticUrl, testCase),
  ]);

  const problems = [];
  // 1. The choice must survive a page that does not mention it.
  if (String(ssr.afterCold.value) !== String(ssr.chosen)) {
    problems.push(`cold load changed it: chose ${JSON.stringify(ssr.chosen)}, got ${JSON.stringify(ssr.afterCold.value)}`);
  }
  // 2. And survive a refresh — this is where an overwritten persist shows up.
  if (String(ssr.afterRefresh) !== String(ssr.chosen)) {
    problems.push(`refresh changed it: chose ${JSON.stringify(ssr.chosen)}, got ${JSON.stringify(ssr.afterRefresh)}`);
  }
  // 3. And match what the app did before SSR existed.
  if (String(ssr.afterCold.value) !== String(stat.afterCold.value)) {
    problems.push(`diverges from static export: SSR ${JSON.stringify(ssr.afterCold.value)} vs static ${JSON.stringify(stat.afterCold.value)}`);
  }

  if (problems.length) {
    failed++;
    console.log(`FAIL ${testCase.name.padEnd(9)} chose ${JSON.stringify(ssr.chosen)}`);
    for (const p of problems) console.log(`       - ${p}`);
  } else {
    const extra = ssr.afterCold.htmlDir ? ` (html dir=${ssr.afterCold.htmlDir})` : "";
    console.log(`ok   ${testCase.name.padEnd(9)} ${JSON.stringify(ssr.chosen)} survived cold load and refresh${extra}`);
  }
}

await browser.close();
console.log(`\n${CASES.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
