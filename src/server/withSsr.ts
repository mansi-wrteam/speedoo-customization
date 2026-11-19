// EGROCER_SERVER_ONLY
//
// The getServerSideProps each page exports. See SSR_PLAN.md §3.3.
//
// Every factory returns `null` when NEXT_PUBLIC_SEO is not "true", which is what
// the 15 pages each did with their own `let serverSidePropsFunction = null`. A
// page whose `getServerSideProps` is null is statically optimised, so the static
// export keeps working exactly as before.
//
// `SSR_MODE` is a compile-time literal, so in a static export build the whole
// server branch — and therefore this module and everything it imports — is
// eliminated. `scripts/verify-server-only.mjs` checks that claim against the
// built chunks rather than trusting it.
//
// Phase 2 deliberately adds NO page data loading. These factories return only
// the SEO props the pages already returned; `migration-baseline/tests/seo` holds
// them to that. The `loader` argument that merges page data arrives in phase 3
// along with `resolveRequestContext`.
import { SSR_MODE } from "@/config/renderMode";
import { assertServerOnly } from "./assertServerOnly";
import { resolveRequestContext, seedFor, type RequestContext } from "./context";
import { applySsrSeed } from "@/redux/applySsrSeed";
import {
  attachRequestScope,
  createRequestStore,
  runWithRequestStore,
} from "./requestStore";
import { loadBlogDetail, loadCategoryDetail, loadProductDetail, MODULE_OVERRIDE } from "./pageData";
import { fetchBlogSeo, fetchCategorySeo, fetchProductSeo, fetchSettingsSeo } from "./seo";
import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import type { DetailSeoProps, ProductSeoProps, SeoProps } from "@/types/seo";

assertServerOnly("server/withSsr");

/** Written client-side when the visitor picks a city. Shared with the browser. */
export const CITY_COOKIE = "eg_city";
/** Written client-side when the visitor switches module. See src/utils/ssrCookies.ts. */
export const MODULE_COOKIE = "eg_module";
/** Written client-side when the visitor switches language. */
export const LANG_COOKIE = "eg_lang";

/**
 * The production kill switch (SSR_PLAN.md §8).
 *
 * `SSR_PAGES` is a comma-separated list of route paths allowed to server-render
 * their body. Unset means "all of them", which is the normal state. If one page
 * misbehaves in production, drop it from the list and restart PM2: that route
 * reverts to today's client-fetch behaviour in seconds, with NO rebuild and no
 * redeploy. It is a server-only variable, so it is read per request.
 */
const bodyAllowedForPath = (pathname: string) => {
  const raw = process.env.SSR_PAGES;
  if (raw == null || raw.trim() === "") return true;
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  // A dynamic route is listed by its base, e.g. `/product` covers /product/<slug>.
  return allowed.some((entry) => pathname === entry || pathname.startsWith(`${entry}/`));
};

/**
 * Seconds a public server-rendered page may be cached. `SSR_CACHE_CONTROL_MAX_AGE`
 * sets `s-maxage`; 0 disables the header entirely.
 *
 * Applied only to public pages rendered as a guest, with nothing user-specific
 * in them (constraint 5).
 *
 * `Vary: Cookie` is NOT optional here. These pages used to be identical for
 * every visitor, which is what made a shared cache safe. They are not any more:
 * `eg_module`, `eg_lang` and `eg_city` change what the server renders, so
 * without `Vary` a CDN would hand one visitor's module, language and city to the
 * next person who asked for the same URL. That is a correctness bug on a page
 * showing prices and stock, and it only appears once something is actually
 * caching in front of the app — which is exactly when it is hardest to debug.
 *
 * The cost is a lower hit rate: a cache now keys on the whole Cookie header, so
 * a visitor carrying unrelated cookies gets their own entry. Correctness first;
 * narrow it later with a CDN that can key on just these three cookies.
 */
const setCacheControl = (res: GetServerSidePropsContext["res"]) => {
  const raw = Number(process.env.SSR_CACHE_CONTROL_MAX_AGE);
  const sMaxAge = Number.isFinite(raw) && raw >= 0 ? raw : 60;
  if (sMaxAge === 0 || !res || typeof res.setHeader !== "function") return;
  // `max-age=0` is for the BROWSER, `s-maxage` for a shared cache in front.
  //
  // Without `max-age`, a browser is free to cache heuristically, and
  // `stale-while-revalidate` then lets it paint a stale page for minutes. On a
  // page whose body depends on `eg_module`, that shows up as the module tab and
  // the URL saying one thing while the products say another — which is exactly
  // what was reported, and why a reload "fixed" it.
  //
  // `Vary: Cookie` below makes a correct cache key, but it protects nothing
  // against entries stored BEFORE it was sent. `max-age=0` makes the browser
  // revalidate every time, which costs one conditional request and removes the
  // whole class. A CDN still gets its 60 seconds.
  res.setHeader(
    "Cache-Control",
    `public, max-age=0, must-revalidate, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 5}`,
  );
  // Append rather than replace: Next sets `Vary: Accept-Encoding` itself.
  const existing = res.getHeader?.("Vary");
  const parts = new Set(
    String(existing ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  parts.add("Cookie");
  res.setHeader("Vary", [...parts].join(", "));
};

export interface SsrOptions {
  /**
   * Fetches the page's own data, returned as the `serverData` map its components
   * read through `useServerData`. Runs only when the body is server-rendered.
   */
  loader?: (ctx: RequestContext) => Promise<Record<string, unknown>>;
  /**
   * True once this page's component tree renders on the server (its `dynamic()`
   * uses `ssr: SSR_MODE`). Until then the page only server-renders its SEO head,
   * so it does not need — and should not pay for — the seed.
   */
  body?: boolean;
}

/**
 * The visitor's chosen city, as coordinates only. The authoritative City record
 * is looked up from the API, so a stale or tampered cookie cannot put wrong
 * prices on the page — the worst it can do is pick a different valid city.
 */
const readCityCookie = (req: GetServerSidePropsContext["req"]) => {
  const raw = req?.cookies?.[CITY_COOKIE];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    const latitude = String(parsed?.latitude ?? "");
    const longitude = String(parsed?.longitude ?? "");
    if (!latitude || !longitude) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
};

/**
 * The module the visitor last switched to. Validated against the live module
 * list in `resolveRequestContext`, so a stale id simply falls back to the first
 * module.
 */
const readModuleCookie = (req: GetServerSidePropsContext["req"]) => {
  const raw = req?.cookies?.[MODULE_COOKIE];
  if (!raw) return null;
  const id = decodeURIComponent(raw).trim();
  return /^\d+$/.test(id) ? id : null;
};

/**
 * The visitor's standing language choice. Validated against the live language
 * list in `resolveRequestContext`, so an unknown code falls back to the default.
 */
const readLangCookie = (req: GetServerSidePropsContext["req"]) => {
  const raw = req?.cookies?.[LANG_COOKIE];
  if (!raw) return null;
  const code = decodeURIComponent(raw).trim();
  return /^[a-zA-Z-]{2,10}$/.test(code) ? code : null;
};

/**
 * Resolves the request, builds its store, parks both on `req` for `_document`,
 * and runs `produce` inside that store's AsyncLocalStorage scope.
 *
 * Everything the page's getServerSideProps does — including anything that calls
 * `t()` or the currency formatter — therefore sees this request's store and no
 * other. `_document` re-enters the same scope for the render itself.
 */
const inRequestScope = async <TProps extends Record<string, unknown>>(
  context: GetServerSidePropsContext,
  produce: (requestContext: RequestContext) => Promise<TProps>,
  { body = false, loader }: SsrOptions = {},
): Promise<TProps> => {
  // The shell payloads are only fetched when this page will actually seed them.
  const requestContext = await resolveRequestContext(
    context.query,
    {
      city: readCityCookie(context.req),
      moduleId: readModuleCookie(context.req),
      lang: readLangCookie(context.req),
    },
    { withShell: body },
  );
  const store = createRequestStore();
  // Seeded only for a page that server-renders its body, and only for a request
  // allowed to (SSR_PLAN.md decision 2) — the same condition under which the
  // browser gets `ssrSeed` below. The two must agree: seeding the server store
  // while the browser's stays empty would make MetaData render the settings
  // favicon and the resolved language on the server and something else on the
  // client, changing the <head> of every page that has not been flipped yet.
  //
  // So a page keeps exactly today's output until its own phase flips it.
  // Three independent conditions, all of which must hold before a body is
  // server-rendered: the page opts in, the request is for the default language
  // (SSR_PLAN.md decision 2), and the route is not switched off at runtime.
  const pathname = (context.resolvedUrl || "").split("?")[0];
  const seedThisRequest = body && requestContext.ssrData && bodyAllowedForPath(pathname);
  if (seedThisRequest) setCacheControl(context.res);
  if (seedThisRequest) applySsrSeed(store, seedFor(requestContext));
  attachRequestScope(context.req, { store, context: requestContext });
  const result = await runWithRequestStore(store, () => produce(requestContext));
  // `ssrSeed` rides along in __NEXT_DATA__ so _app can put the browser's store
  // into the same state before its first render.
  //
  // Attached only when BOTH are true:
  //   * this page server-renders its body (`body`), and
  //   * this request is allowed to (`ssrData` — SSR_PLAN.md decision 2).
  //
  // The seed is ~120 KB uncompressed, mostly the settings payload and the
  // translation dictionary. A page that still renders its body in the browser
  // gains nothing from it and would just pay the bytes, so it keeps exactly
  // today's payload until it is flipped.
  if (seedThisRequest && "props" in result) {
    const props = (result as unknown as { props: Record<string, unknown> }).props;
    props.ssrSeed = seedFor(requestContext);
    if (loader) {
      // Inside the request scope so the loader sees this request's store, and
      // after the SEO fetch so a slow loader cannot delay the head.
      const serverData = await runWithRequestStore(store, () => loader(requestContext));
      // Only attached when it actually carries something: an empty map would
      // make components think the server provided data and skip their fetch.
      // A loader may report that the thing itself does not exist. This is the
      // ONLY acceptable source for a 404: an earlier version inferred it from
      // the SEO lookup returning no metadata, which 404'd every product that
      // simply had no SEO record configured — nearly the whole catalogue.
      if ((serverData as { __notFound?: boolean })?.__notFound) {
        if (notFoundOnMissingEnabled()) return { notFound: true } as unknown as TProps;
        delete (serverData as { __notFound?: boolean }).__notFound;
      }
      // A detail loader may discover that the thing lives in a DIFFERENT module
      // than the request resolved — a shared `/product/<slug>` link carries no
      // `?module=`, so the visitor's cookie (or the default) decides, and for
      // three modules out of four that is the wrong answer. The loader searched
      // the other modules and found it; adopt that module now, before the tree
      // renders, so the header, catalogue and prices around the product match
      // it. Pinned, because it came from the entity itself, not a fallback.
      const override = (serverData as Record<string, unknown>)?.[MODULE_OVERRIDE];
      if (override != null) {
        delete (serverData as Record<string, unknown>)[MODULE_OVERRIDE];
        requestContext.activeModuleId = override as RequestContext["activeModuleId"];
        requestContext.modulePinned = true;
        const corrected = seedFor(requestContext);
        props.ssrSeed = corrected;
        // The server store was seeded with the old module above; re-seed so the
        // markup and the browser agree.
        applySsrSeed(store, corrected);
      }

      if (serverData && Object.keys(serverData).length) {
        props.serverData = serverData;

        // The homepage renders from `state.Shop`, which `Homepage` normally
        // fills in a mount effect — and an effect never runs during a server
        // render. So the shop payload is pushed into the store HERE, after the
        // loader and before `_document` renders the tree, and repeated into the
        // seed so the browser's first render matches. Without this the homepage
        // server-renders empty no matter what the loader fetched.
        const shop = (serverData as { shop?: unknown }).shop;
        if (shop) {
          const seed = { ...seedFor(requestContext), shop } as Parameters<typeof applySsrSeed>[1];
          applySsrSeed(store, seed);
          props.ssrSeed = seed;
        }
      }
    }
  }
  return result;
};

/**
 * A settings-driven page: home, blogs, products, contact-us, about-us, faqs and
 * the five policy pages. `routeId` selects the variant in `SETTINGS_SEO`.
 */
export const withSettingsSeo = (
  routeId: string,
  options: SsrOptions = {},
): GetServerSideProps<SeoProps> | null =>
  SSR_MODE
    ? async (context) =>
        inRequestScope(
          context,
          async (requestContext) => ({
            props: await fetchSettingsSeo(routeId, requestContext.lang),
          }),
          options,
        )
    : null;

/** `product/[slug]`. A failed lookup still renders, with the default meta. */
/**
 * Return a real 404 for a slug the API does not know (SSR_PLAN.md decision 1).
 *
 * DEFAULT ON since phase 8. Today `/product/does-not-exist` answers 200 with a client-side
 * "not found", and `migration-baseline/build/seo-pages.txt` records that. A soft
 * 404 is an SEO defect — Google treats the page as real and keeps crawling it —
 * but flipping it mid-plan would change status codes while the SSR work is still
 * being verified, so any status-code diff during phases 1-7 would be ambiguous.
 * Phase 8 turned it on and re-recorded the two baseline cases. Set
 * `SSR_404_ON_MISSING=false` to go back to the old 200-with-a-message.
 *
 * The static export cannot do this at all and keeps answering 200 forever.
 */
export const notFoundOnMissingEnabled = () =>
  String(process.env.SSR_404_ON_MISSING ?? "true").toLowerCase() !== "false";

export const withProductSeo = (
  options: SsrOptions = {},
): GetServerSideProps<ProductSeoProps, { slug: string }> | null =>
  SSR_MODE
    ? async (context) =>
        inRequestScope(
          context,
          async (requestContext) => ({
            props: await fetchProductSeo(context.params!.slug, requestContext.lang),
          }),
          // The slug is only known per request, so the loader is bound here.
          {
            ...options,
            loader: options.body
              ? (ctx) => loadProductDetail(context.params!.slug, ctx)
              : undefined,
          },
        )
    : null;

/** `categories/[...slug]`, covering both the "all" grid and a single category. */
export const withCategorySeo = (
  options: SsrOptions = {},
): GetServerSideProps<DetailSeoProps<string[]>, { slug: string[] }> | null =>
  SSR_MODE
    ? async (context) => {
        const { slug } = context.params!;
        const slugArr = Array.isArray(slug) ? slug : [slug];
        return inRequestScope(
          context,
          async (requestContext) => ({
            props: await fetchCategorySeo(slugArr, requestContext.lang),
          }),
          // Bound per request: the slug array is only known here, and it decides
          // which of the two flows (and which component) the loader serves.
          {
            ...options,
            loader: options.body ? (ctx) => loadCategoryDetail(slugArr, ctx) : undefined,
          },
        );
      }
    : null;

/** `blog/[slug]`. An unknown slug is a real 404, as it is today. */
export const withBlogSeo = (
  options: SsrOptions = {},
): GetServerSideProps<DetailSeoProps, { slug: string }> | null =>
  SSR_MODE
    ? async (context) =>
        inRequestScope(
          context,
          async (requestContext) => {
            const props = await fetchBlogSeo(context.params!.slug, requestContext.lang);
            if (!props) return { notFound: true } as const;
            return { props };
          },
          // The slug is only known here, so the loader is bound per request.
          { ...options, loader: options.body ? (ctx) => loadBlogDetail(context.params!.slug, ctx) : undefined },
        )
    : null;

/**
 * A public page that has no SEO entry of its own: /brands, /sellers, /countries.
 *
 * These had NO getServerSideProps at all before phase 5 — they were statically
 * optimised (`○`), which is why this adds three `ƒ` rows to the standalone route
 * table. They are already listed in sitemap.xml, so they were meant to be
 * crawlable all along.
 *
 * There is no SEO lookup to do, so the props carry only the seed and the loader's
 * data; MetaData keeps falling back to the env defaults exactly as before.
 */
export const withPageData = (
  loader: (ctx: RequestContext) => Promise<Record<string, unknown>>,
): GetServerSideProps | null =>
  SSR_MODE
    ? async (context) =>
        inRequestScope(context, async () => ({ props: {} }), { body: true, loader })
    : null;
