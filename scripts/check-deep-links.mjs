// Deep links: landing straight on a URL, the way a crawler, a shared link or a
// bookmark does — with no history and usually no cookies.
//
// This is the case server rendering exists for, and the one most likely to be
// wrong, because everything the app normally relies on is absent: no previous
// page set the module, no effect has run, redux-persist is empty.
//
// Three things are checked per link, and they are different questions:
//
//   SERVER   the HTML as sent. This is all a crawler ever sees — it does not run
//            effects, so anything filled in after mount does not exist for it.
//   CLIENT   the DOM after hydration settles. Must agree with the server, or the
//            visitor watches the page change under them.
//   MODULE   the module the page ends up in. A food product opened cold must not
//            land the visitor in Grocery, and must not silently show another
//            module's catalogue around it.
//
// usage: node scripts/check-deep-links.mjs <baseUrl> [--keep-open]
import { chromium } from "playwright";

const base = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!base) {
  console.error("usage: node scripts/check-deep-links.mjs <baseUrl>");
  process.exit(2);
}

const GROCERY = 1;
const FOOD = 4;

/**
 * `cookies` is what the visitor arrives carrying. The interesting rows are the
 * ones where the cookie DISAGREES with the link: a visitor whose last session
 * was Grocery, following a food link someone sent them. The link has to win,
 * otherwise shared links show the wrong catalogue.
 */
const CASES = [
  {
    name: "product (grocery), cold",
    path: "/product/fresh-tomatoes?lang=en",
    expectText: /Tomato/i,
    expectModule: GROCERY,
  },
  {
    name: "product (food), cold",
    path: "/product/vegetable-spring-rolls?lang=en",
    expectText: /Spring Roll/i,
    expectModule: FOOD,
  },
  {
    name: "product (food), grocery cookie",
    path: "/product/vegetable-spring-rolls?lang=en",
    cookies: { eg_module: String(GROCERY) },
    expectText: /Spring Roll/i,
    expectModule: FOOD,
  },
  {
    name: "product (food) + ?module=food",
    path: "/product/vegetable-spring-rolls?lang=en&module=food-delivery",
    cookies: { eg_module: String(GROCERY) },
    expectText: /Spring Roll/i,
    expectModule: FOOD,
  },
  {
    name: "category, cold",
    path: "/categories/fruits-vegetables?lang=en",
    expectText: /Fruits\s*&(amp;)?\s*Vegetables/i,
    expectModule: GROCERY,
  },
  {
    name: "category, food cookie",
    path: "/categories/fruits-vegetables?lang=en",
    cookies: { eg_module: String(FOOD) },
    expectText: /Fruits\s*&(amp;)?\s*Vegetables/i,
  },
  {
    name: "blog post, cold",
    path: "/blog/reducing-food-waste-smart-buying-and-storage-strategies?lang=en",
    expectText: /Food Waste/i,
  },
  {
    name: "blog post, arabic cookie",
    path: "/blog/reducing-food-waste-smart-buying-and-storage-strategies?lang=en",
    cookies: { eg_lang: "ar" },
    // ?lang=en is explicit and must beat the cookie.
    expectHtmlLang: "en",
  },
  {
    name: "listing, cold",
    path: "/products?lang=en",
    expectModule: GROCERY,
  },
  {
    name: "listing, food cookie",
    path: "/products?lang=en",
    cookies: { eg_module: String(FOOD) },
    expectModule: FOOD,
  },
  {
    name: "missing blog",
    path: "/blog/no-such-post-xyz?lang=en",
    expectStatus: 404,
  },
];

const browser = await chromium.launch();
let failed = 0;

console.log(`deep links against ${base}\n`);

for (const c of CASES) {
  const context = await browser.newContext();
  if (c.cookies) {
    await context.addCookies(
      Object.entries(c.cookies).map(([name, value]) => ({
        name, value, domain: new URL(base).hostname, path: "/",
      })),
    );
  }
  const page = await context.newPage();
  const problems = [];

  // SERVER: fetched, not rendered. What a crawler is handed.
  const response = await page.request.get(base + c.path, {
    headers: { cookie: Object.entries(c.cookies ?? {}).map(([k, v]) => `${k}=${v}`).join("; ") },
  });
  const html = await response.text();
  const status = response.status();

  if (c.expectStatus && status !== c.expectStatus) {
    problems.push(`status ${status}, expected ${c.expectStatus}`);
  } else if (!c.expectStatus && status !== 200) {
    problems.push(`status ${status}`);
  }

  if (status === 200) {
    if (c.expectText && !c.expectText.test(html)) {
      problems.push(`server HTML missing ${c.expectText} — a crawler sees nothing`);
    }
    if (c.expectHtmlLang) {
      const m = html.match(/<html[^>]*lang="([^"]*)"/);
      if (m?.[1] !== c.expectHtmlLang) problems.push(`<html lang> is ${m?.[1]}, expected ${c.expectHtmlLang}`);
    }
    if (c.expectModule != null) {
      const m = html.match(/"activeModuleId":(\d+)/);
      if (m && Number(m[1]) !== c.expectModule) {
        problems.push(`server rendered module ${m[1]}, expected ${c.expectModule}`);
      }
    }

    // CLIENT: the same URL in a real browser, after hydration settles.
    await page.goto(base + c.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.body.innerText);
    if (c.expectText && !c.expectText.test(text)) {
      problems.push(`after hydration the page no longer shows ${c.expectText}`);
    }
    if (c.expectModule != null) {
      const live = await page.evaluate(() => {
        try { return JSON.parse(JSON.parse(localStorage.getItem("persist:root")).Module).activeModuleId; }
        catch { return null; }
      });
      if (live != null && Number(live) !== c.expectModule) {
        problems.push(`browser settled on module ${live}, expected ${c.expectModule}`);
      }
    }
  }

  if (problems.length) {
    failed++;
    console.log(`FAIL ${c.name}`);
    console.log(`       ${c.path}`);
    problems.forEach((p) => console.log(`       - ${p}`));
  } else {
    console.log(`ok   ${c.name}`);
  }
  await context.close();
}

await browser.close();
console.log(`\n${CASES.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
