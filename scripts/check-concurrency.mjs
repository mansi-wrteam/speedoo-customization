// Proves that two requests being served at the same time cannot see each
// other's state.
//
// SSR_PLAN.md §7.4, and the guard on §3.2. The app reaches Redux from outside
// React in six places — `t()` alone has 1060 call sites — so those reads cannot
// become hooks and go through `getActiveStore()` instead. In the browser that
// returns a single store, which is correct. On a server it must return the store
// built for the request currently being rendered. If that resolution is ever
// wrong, a visitor asking for Arabic can be served the Hindi page that was being
// built next to it, and in the worst case one visitor's session reaches
// another's HTML.
//
// The test is calibration followed by a stampede:
//
//   1. Fetch each language ONE AT A TIME. Nothing is concurrent, so whatever
//      comes back is that language's correct answer. That becomes the expected
//      value — no hardcoded strings, so it keeps working when the SEO text is
//      edited in the admin panel.
//   2. Fire N requests at once, alternating languages, and require every
//      response to match its OWN language's calibrated answer.
//
// If the two languages return identical text, the test cannot tell them apart.
// It then reports INCONCLUSIVE and exits non-zero rather than passing, because a
// green result would be meaningless.
//
// Usage:
//   node scripts/check-concurrency.mjs http://127.0.0.1:8011
//   node scripts/check-concurrency.mjs http://127.0.0.1:8011 --langs=en,ar --n=50
//   node scripts/check-concurrency.mjs http://127.0.0.1:8011 --path=/products
//
// Exit 0 = no leak detected. 1 = leak, or inconclusive. 2 = bad usage.
//
// What is compared grows with the plan. Today only the <head> varies by request,
// so only the head is compared, and the body/currency probes report themselves
// as not-yet-applicable rather than silently passing.

const args = process.argv.slice(2);
const base = args.find((a) => !a.startsWith("--"));
const flag = (name, fallback) =>
  (args.find((a) => a.startsWith(`--${name}=`)) || `--${name}=${fallback}`).split("=")[1];

const modulesFlag = args.find((a) => a.startsWith("--modules="));
// Which query parameter is varied. `--modules=` switches the axis from language
// to module, which matters because SSR_PLAN.md decision 2 seeds the store only
// for the DEFAULT language — so on the language axis no store-backed field can
// vary, and only the module axis can prove Redux isolation.
const axis = modulesFlag ? "module" : "lang";
const langs = (modulesFlag ? modulesFlag.split("=")[1] : flag("langs", "en,ar"))
  .split(",")
  .filter(Boolean);
const count = Number(flag("n", "50"));
const probePath = flag("path", "/");

if (!base || langs.length < 2 || !Number.isFinite(count) || count < 2) {
  console.error(
    "usage: node scripts/check-concurrency.mjs <baseUrl> [--langs=en,ar] [--n=50] [--path=/]",
  );
  process.exit(2);
}

const url = (value) =>
  `${base}${probePath}${probePath.includes("?") ? "&" : "?"}${axis}=${value}`;

/** The per-request values a response is allowed to vary by. */
const fingerprint = (html) => ({
  // Echoes the request's own ?lang= through the router. Varies per request
  // today, so it is the only probe available before SSR_PLAN.md phase 3 — but
  // see PROBE_KIND: it does not travel through the Redux store, so it cannot
  // detect a store mix-up.
  canonical: html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/)?.[1] ?? null,
  // These come from the SEO API via the store, which is what §3.2 is about.
  title: html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1]?.trim() ?? null,
  description:
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/)?.[1]?.trim() ?? null,
  // Emitted by _document from the resolved request context (phase 3a).
  htmlLang: html.match(/<html[^>]+lang="([^"]*)"/)?.[1] ?? null,
  dir: html.match(/<html[^>]+dir="([^"]*)"/)?.[1] ?? null,
  // MetaData renders this from `useSelector(state.Language.selectedLanguage)`,
  // so it only varies once the Provider is handed the per-request store in
  // phase 3b. Until then it is "en" for every request.
  metaLanguage:
    html.match(/<meta[^>]+name="language"[^>]+content="([^"]*)"/)?.[1] ?? null,
  // The module the server seeded into Redux for this request. Header reads it
  // through useSelector, so a wrong value here means one request's store was
  // used to render another's page.
  moduleId: (() => {
    const m = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
    );
    if (!m) return null;
    try {
      const seed = JSON.parse(m[1])?.props?.pageProps?.ssrSeed;
      return seed?.activeModuleId != null ? String(seed.activeModuleId) : null;
    } catch {
      return null;
    }
  })(),
});

// Not all probes are equally strong, and conflating them would overstate what a
// green run means.
//
//   request — derived from the incoming URL. Proves Next did not hand request A's
//             URL to request B's render. Real, but it never touches the store.
//   context — resolved per request by server/context.ts and rendered by
//             _document. Proves the resolved context did not cross requests.
//             Stronger than `request`, still not Redux.
//   store   — read out of Redux during the render. This is the one §3.2 cares
//             about, because `t()`, the currency formatter and the axios
//             interceptors all read the store from outside React.
const PROBE_KIND = {
  canonical: "request",
  htmlLang: "context",
  dir: "context",
  title: "store",
  description: "store",
  metaLanguage: "store",
  moduleId: "store",
};

const fetchOne = async (value) => {
  const res = await fetch(url(value), { headers: { "User-Agent": "ssr-concurrency-check" } });
  const html = await res.text();
  return { status: res.status, ...fingerprint(html) };
};

// ── 1. Calibrate, strictly one at a time.
console.log(`calibrating ${langs.length} ${axis} value(s) on ${probePath}, serially…`);
const expected = {};
for (const lang of langs) {
  const got = await fetchOne(lang);
  if (got.status !== 200) {
    console.error(`calibration failed: ${url(lang)} returned HTTP ${got.status}`);
    process.exit(1);
  }
  expected[lang] = got;
  console.log(`  ${lang}: title=${JSON.stringify(got.title)} htmlLang=${got.htmlLang} moduleId=${got.moduleId}`);
}

// Only compare fields that actually differ between languages. A field that is
// the same everywhere proves nothing, and a field that is not server-rendered
// yet would make every run fail for the wrong reason.
const CANDIDATES = Object.keys(PROBE_KIND);
const varyingFields = CANDIDATES.filter((field) => {
  const values = langs.map((l) => expected[l][field]);
  return new Set(values).size === langs.length && values.every((v) => v != null);
});

const inertFields = CANDIDATES.filter((f) => !varyingFields.includes(f));
if (inertFields.length) {
  console.log(
    `  not comparable yet (same for every language, or not server-rendered): ${inertFields.join(", ")}`,
  );
}

if (!varyingFields.length) {
  console.error(
    `\nINCONCLUSIVE: no field differs between ${langs.join(" and ")}, so a mix-up would be\n` +
      `invisible to this test. Either the API returns the same SEO text for these\n` +
      `languages, or per-language rendering is not wired up yet. Pick languages whose\n` +
      `SEO text differs (--langs=), or a path whose content differs (--path=).\n` +
      `Not reporting a pass on a test that cannot fail.`,
  );
  process.exit(1);
}

const storeProbes = varyingFields.filter((f) => PROBE_KIND[f] === "store");
const contextProbes = varyingFields.filter((f) => PROBE_KIND[f] === "context");
console.log(
  `comparing on: ${varyingFields.map((f) => `${f} (${PROBE_KIND[f]})`).join(", ")}`,
);
if (!storeProbes.length) {
  console.log(
    contextProbes.length
      ? `  NOTE: ${contextProbes.join(", ")} vary, so this run proves the resolved\n` +
          `  request context did not cross between concurrent requests. It does NOT yet\n` +
          `  prove Redux isolation: the Provider is still handed the module singleton,\n` +
          `  so useSelector-backed output is identical for every request. The store\n` +
          `  probe turns on in SSR_PLAN.md phase 3b.`
      : `  NOTE: no store-backed field varies between these languages, so this run can\n` +
          `  only prove that request URLs did not cross — not that the Redux store did\n` +
          `  not. Treat a pass here as "routing is clean", not as "§3.2 is proven".`,
  );
}

// ── 2. Stampede.
console.log(`firing ${count} concurrent requests, alternating ${axis}…`);
const plan = Array.from({ length: count }, (_, i) => langs[i % langs.length]);
const results = await Promise.all(
  plan.map(async (lang, i) => {
    try {
      return { i, lang, got: await fetchOne(lang) };
    } catch (error) {
      return { i, lang, error: error.message };
    }
  }),
);

const problems = [];
for (const { i, lang, got, error } of results) {
  if (error) {
    problems.push(`#${i} lang=${lang}: request failed — ${error}`);
    continue;
  }
  if (got.status !== 200) {
    problems.push(`#${i} lang=${lang}: HTTP ${got.status}`);
    continue;
  }
  for (const field of varyingFields) {
    if (got[field] === expected[lang][field]) continue;
    const servedTo = langs.find((l) => expected[l][field] === got[field]);
    problems.push(
      `#${i} lang=${lang}: ${field} is ${JSON.stringify(got[field])}, expected ` +
        `${JSON.stringify(expected[lang][field])}` +
        (servedTo ? ` — that is the ${servedTo} value, so state crossed between requests` : ""),
    );
  }
}

if (problems.length) {
  console.error(`\nCROSS-REQUEST LEAK (${problems.length} of ${count} responses wrong):`);
  for (const p of problems.slice(0, 20)) console.error(`  - ${p}`);
  if (problems.length > 20) console.error(`  … and ${problems.length - 20} more`);
  console.error(
    `\nSee SSR_PLAN.md §3.2. If this fails after the server store resolver is\n` +
      `installed, the recorded fallback is a custom server with als.run(), which\n` +
      `means dropping output: "standalone" and needs approval.`,
  );
  process.exit(1);
}

if (storeProbes.length) {
  console.log(
    `\nno leak: all ${count} concurrent responses matched their own language, ` +
      `including store-backed field(s): ${storeProbes.join(", ")}.`,
  );
} else {
  console.log(
    `\nPARTIAL PASS: all ${count} concurrent responses matched their own request ` +
      `(${varyingFields.map((f) => `${f}/${PROBE_KIND[f]}`).join(", ")}).\n` +
      `Redux store isolation is NOT yet covered — see the note above.`,
  );
}
