// Fails if React finds a different tree in the browser than the server sent.
//
// SSR_PLAN.md §5. This is the gate that decides whether server rendering is
// worth anything. When markup does not match, React 19 discards the server HTML
// for that subtree and re-renders it on the client: the page still looks right,
// `check-ssr-content.mjs` still passes because the HTML really did contain the
// content, and every benefit is gone. The only visible trace is a console
// message, so that is what this watches.
//
// The usual causes in this app, all handled by `useMounted` (src/utils):
//   - redux-persist state: cart badge, wishlist hearts, the signed-in name. The
//     server renders as a guest; localStorage is only read after mount.
//   - `useMediaQuery`, which has no viewport to measure on the server.
//   - anything reading `window`/`localStorage` during render.
//
// Usage:
//   node scripts/check-hydration.mjs http://127.0.0.1:8011
//   node scripts/check-hydration.mjs http://127.0.0.1:8011 --routes=/,/about-us
//
// Exit 0 = clean. 1 = a mismatch. 2 = bad usage.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--"));
const routesArg = args.find((a) => a.startsWith("--routes="));

if (!base) {
  console.error("usage: node scripts/check-hydration.mjs <baseUrl> [--routes=/a,/b]");
  process.exit(2);
}

// EVERY route that server-renders its body. The default used to be six of
// them, which is how a mismatch on all eighteen went unnoticed: the six that
// were checked happened to be the ones that passed. A page is only worth
// server-rendering if it survives hydration, so the default covers the lot.
const SSR_ROUTES = [
  "/",
  "/products",
  "/blogs",
  "/categories/all",
  "/categories/fruits-vegetables",  // flow 1: category with sub-categories
  "/categories/grocery-staples",
  "/product/fresh-tomatoes",
  "/sellers",
  "/countries",
  "/brands",
  "/about-us",
  "/faqs",
  "/contact-us",
  "/privacy-policy",
  "/terms-and-conditions",
  "/shipping-policy",
  "/cancellation-policy",
  "/return-and-exchange-policy",
];

const routes = routesArg
  ? routesArg.split("=")[1].split(",").filter(Boolean)
  : SSR_ROUTES;

/**
 * Every route is checked at three widths AND on a reload, not just a first load.
 * Both axes were blind spots that hid real, shipping bugs:
 *
 *   width   `useMediaQuery` answers `false` on the server and `true` on a phone,
 *           so the product page server-rendered the desktop zoom viewer while
 *           every phone built the mobile one. Checking only the default viewport
 *           never saw it.
 *
 *   reload  the first visit fills redux-persist; the SECOND load is where the
 *           client holds state the server cannot know. The footer's payment
 *           icons did exactly that and broke hydration on EVERY route — while a
 *           first-load-only check called all of them clean.
 *
 * The reload pass is the one that catches the whole "client remembers something
 * the server does not" family, which is most of what has gone wrong here.
 */
const WIDTHS = [375, 768, 1440];

// React phrases these differently across versions; match the family, not one string.
//
// A PRODUCTION build does not ship those sentences. It throws
// "Minified React error #418" with the text behind a link, so matching only on
// prose made this check silently blind in exactly the build it is pointed at —
// it passed a route that was demonstrably throwing #418. The codes are matched
// first for that reason.
//
//   418  server HTML did not match the client
//   422  a suspense boundary had to be client-rendered
//   423  error while hydrating, boundary fell back to client render
//   425  text content did not match
const HYDRATION_CODES = /Minified React error #(418|422|423|425)\b/;
const HYDRATION_NOISE =
  /hydrat|did not match|Text content does not match|server rendered HTML|server-rendered HTML/i;
const isHydrationProblem = (text) => HYDRATION_CODES.test(text) || HYDRATION_NOISE.test(text);

const browser = await chromium.launch();
let failed = 0;

let checks = 0;

for (const width of WIDTHS) {
  for (const route of routes) {
    // A fresh context per route so the first pass really is a first visit.
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    let messages = [];

    page.on("console", (m) => {
      const text = m.text();
      if (isHydrationProblem(text)) messages.push(`console.${m.type()}: ${text.slice(0, 200)}`);
    });
    page.on("pageerror", (e) => {
      if (isHydrationProblem(e.message)) messages.push(`pageerror: ${e.message.slice(0, 200)}`);
    });

    for (const pass of ["first", "reload"]) {
      messages = [];
      try {
        if (pass === "first") {
          await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 45000 });
        } else {
          // The second load is the one that has redux-persist filled in.
          await page.reload({ waitUntil: "networkidle", timeout: 45000 });
        }
        // Hydration happens after the bundle evaluates; give it room to complain.
        await page.waitForTimeout(1500);
      } catch (error) {
        messages.push(`navigation failed: ${error.message.split("\n")[0]}`);
      }

      checks += 1;
      if (messages.length) {
        failed += 1;
        console.log(`FAIL ${String(width).padEnd(5)} ${pass.padEnd(6)} ${route}`);
        messages.slice(0, 2).forEach((m) => console.log(`       ${m}`));
      }
    }
    await context.close();
  }
  console.log(`ok   ${width}px — ${routes.length} routes, first load and reload`);
}

await browser.close();

if (failed) {
  console.error(`\n${failed} of ${checks} checks reported a hydration mismatch.`);
  process.exit(1);
}
console.log(`\nno hydration mismatches: ${routes.length} routes x ${WIDTHS.length} widths x first/reload = ${checks} checks.`);
