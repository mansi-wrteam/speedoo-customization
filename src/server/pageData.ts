// EGROCER_SERVER_ONLY
//
// Per-page data loaders. Each returns the `serverData` map a page's components
// read through `useServerData` (SSR_PLAN.md §3.3, §3.5).
//
// Every loader must answer with the SAME shape the client's own fetch produces,
// because the component uses it as its `useState` initial value. Where the client
// reads `response.data` and `response.total`, so does the loader.
//
// None of them throws: a failed load returns undefined for that key, the
// component falls back to fetching on mount, and the page behaves exactly as it
// does today. `withSsr` keeps the page rendering either way.
import { assertServerOnly } from "./assertServerOnly";
import { serverGet, serverPostForm } from "./http";
import type { ApiResponse } from "@/types/api";
import type {
  Blog,
  BlogCategory,
  BlogTag,
  Brand,
  Country,
  Faq,
  Product,
  Seller,
  ShopData,
} from "@/types/models";
import type { Id } from "@/types/common";
import type { RequestContext } from "./context";

assertServerOnly("server/pageData");

/** Mirrors the client's page size so the first page matches exactly. */
const FAQ_LIMIT = 7;
const BLOG_LIMIT = 10;

/**
 * True only for a response the client would also have accepted.
 *
 * This matters more than it looks: a seeded key makes the component SKIP its own
 * fetch. Seeding `{ data: [] }` from a failed or `status: 0` response would
 * therefore leave the page permanently empty, where before it would have
 * retried in the browser. So a non-success response must seed NOTHING and let
 * the client fetch, exactly as it does today.
 */
const ok = (body: { status?: number | string } | undefined | null) =>
  body != null && String(body.status) === "1";

/**
 * "The request reached the API and came back" — regardless of what it said.
 *
 * The distinction matters for endpoints whose EMPTY answer is `status: 0` with a
 * message rather than `status: 1` with `data: []`. `brands` does this ("No
 * brands found in this area."), and so does a category leaf ("No Category
 * Found!").
 *
 * Those are successful, correct answers, and refusing to seed them means the
 * client repeats the identical request on mount and shows a skeleton until it
 * returns — for a page that is going to be empty either way.
 *
 * Used ONLY where an empty result is a legitimate state the page renders
 * properly. A failed request stays unseeded (`safe` returns undefined), because
 * seeding `[]` on a failure is how a transient API error turns into a
 * permanently empty page: the seed suppresses the client fetch that would have
 * recovered. That mistake was made once already during phase 3b.
 */
const reached = (body: unknown) => body !== undefined;

/**
 * Removes seller contact details before a product list is embedded in the page.
 *
 * Was D6. The products endpoint returns `seller.mobile` (and email) on every
 * row, and server-rendering a 30-product grid put 30 shop phone numbers into
 * `__NEXT_DATA__` — page source a crawler reads and a CDN can cache. The client
 * already received the same payload by XHR, so this is not a new disclosure, but
 * it is a new and much more durable exposure surface, and nothing on a listing
 * renders those fields.
 *
 * Seeding without them is safe because the client refetches the full row
 * whenever it actually needs it.
 */
const stripSellerContact = <T>(rows: T[] | undefined): T[] => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const seller = (row as { seller?: Record<string, unknown> })?.seller;
    if (!seller) return row;
    const { mobile: _mobile, email: _email, ...rest } = seller;
    return { ...row, seller: rest } as T;
  });
};

/**
 * The module a deep-linked entity actually lives in.
 *
 * A product or category belongs to ONE module, but a deep link rarely says
 * which: `sitemap.xml` lists bare `/product/<slug>` URLs, and so does every link
 * anyone shares or pastes. The server then resolves the module from the request
 * — `?module=`, the cookie, else the first module — and asks the API for the
 * product under that one. For 3 of the 4 modules that lookup returns nothing, so
 * the page rendered empty: a crawler saw no product at all, and a visitor
 * following a shared link saw a blank page that a reload did not fix.
 *
 * So: try the module the request asked for, and only if that comes back empty,
 * try the others. The common case still costs exactly one call — the extra ones
 * happen only when the first found nothing, which is also the only case where
 * there was anything to lose.
 *
 * The module it succeeds under is returned so the caller can PIN it, putting the
 * rest of the page (header, catalogue, prices) in the same module as the thing
 * the visitor came to see.
 */
const inAnyModule = async <T extends { status?: number | string }>(
  label: string,
  ctx: RequestContext,
  load: (moduleId: Id | null) => Promise<T>,
): Promise<{ body: T | undefined; moduleId: Id | null; answeredEverywhere: boolean }> => {
  const first = await safe(label, () => load(ctx.activeModuleId));
  if (ok(first)) return { body: first, moduleId: ctx.activeModuleId, answeredEverywhere: true };
  // False once any call threw: "no module has it" is then not established,
  // because the module that has it may be the one that failed.
  let answeredEverywhere = first !== undefined;

  const others = (ctx.modules ?? [])
    .map((m) => m?.id)
    .filter((id): id is Id => id != null && String(id) !== String(ctx.activeModuleId));

  for (const id of others) {
    const body = await safe(`${label}@module:${id}`, () => load(id));
    if (ok(body)) return { body, moduleId: id, answeredEverywhere: true };
    if (body === undefined) answeredEverywhere = false;
  }
  // Nothing anywhere: hand back the original attempt so the caller behaves
  // exactly as it did before this existed.
  return { body: first, moduleId: ctx.activeModuleId, answeredEverywhere };
};

/**
 * The key a loader uses to tell `withSsr` that the entity lives in a different
 * module than the request resolved, so the seed can be corrected before the page
 * renders. Stripped from `serverData` — components never see it.
 */
export const MODULE_OVERRIDE = "__moduleOverride";

const safe = async <T>(label: string, load: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await load();
  } catch (error) {
    console.log(`server/pageData: ${label} failed, client will fetch`, error);
    return undefined;
  }
};

/** `/faqs` — first page only; "load more" stays a client fetch. */
export const loadFaqs = async (ctx: RequestContext) => {
  const body = await safe("faqs", () =>
    serverGet<ApiResponse<Faq[]>>("faqs", { params: { limit: FAQ_LIMIT, offset: 0 }, lang: ctx.lang }),
  );
  if (!ok(body)) return {};
  return { faqs: { data: body!.data ?? [], total: body!.total ?? 0 } };
};

/**
 * `/blogs` — the cards plus the sidebar.
 *
 * Endpoints and params copied from the four calls Blogs.tsx makes on mount, not
 * guessed: `blogs`, `blog_categories` (limit 10), `blog_popular_tags` (no
 * params) and `blogs/most_viewed` (which ignores its limit argument, as the
 * client's own call does).
 */
export const loadBlogs = async (ctx: RequestContext) => {
  const [list, categories, tags, mostViewed] = await Promise.all([
    safe("blogs", () =>
      serverGet<ApiResponse<Blog[]>>("blogs", {
        params: { limit: BLOG_LIMIT, offset: 0 },
        lang: ctx.lang,
      }),
    ),
    safe("blog_categories", () =>
      serverGet<ApiResponse<BlogCategory[]>>("blog_categories", {
        params: { limit: 10, offset: 0, search: "" },
        lang: ctx.lang,
      }),
    ),
    safe("blog_popular_tags", () =>
      serverGet<ApiResponse<BlogTag[]>>("blog_popular_tags", { lang: ctx.lang }),
    ),
    safe("blogs/most_viewed", () =>
      serverGet<ApiResponse<Blog[]>>("blogs/most_viewed", { lang: ctx.lang }),
    ),
  ]);

  const data: Record<string, unknown> = {};
  if (ok(list)) data.blogs = { data: list!.data ?? [], total: list!.total ?? 0 };
  if (ok(categories)) data.blogCategories = categories!.data ?? [];
  if (ok(tags)) data.blogTags = tags!.data ?? [];
  if (ok(mostViewed)) data.mostViewedBlogs = mostViewed!.data ?? [];
  return data;
};

/** `blog/[slug]` — the post itself. */
export const loadBlogDetail = async (slug: string, ctx: RequestContext) => {
  const body = await safe("blog_detail", () =>
    serverGet<ApiResponse<Blog[]>>("blogs", { params: { slug }, lang: ctx.lang }),
  );
  const blog = ok(body) ? body!.data?.[0] : undefined;
  return blog ? { blog } : {};
};


// ── Phase 5: the three listings that were never server-rendered at all ───────
//
// All three are city-scoped and module-scoped, so each loader passes the city the
// request context resolved and the active module as `X-Module-Id` — the same two
// inputs `moduleHeader()` and the redux City slice give the client. Without them
// the API answers about a different module or city than the browser will ask
// about, and the page hydrates into different data.
//
// A missing city means the client could not have fetched either (its own effects
// gate on `city`), so the loader returns nothing and the page behaves as today.

// Must equal the components' own page size, or the server fetches a different
// slice than the client would and the list changes on hydration.
// Brand.tsx:19 and CountryListing.tsx:24 both use 12.
const BRANDS_PER_PAGE = 12;
const COUNTRIES_PER_PAGE = 12;

/** `/brands` — first page plus the global background colours the grid uses. */
export const loadBrands = async (ctx: RequestContext) => {
  if (!ctx.city?.latitude) return {};
  const body = await safe("brands", () =>
    serverGet<ApiResponse<Brand[]> & {
      brand_background_color_light_theme?: string | null;
      brand_background_color_dark_theme?: string | null;
    }>("brands", {
      params: {
        limit: BRANDS_PER_PAGE,
        offset: 0,
        latitude: ctx.city?.latitude,
        longitude: ctx.city?.longitude,
      },
      lang: ctx.lang,
      moduleId: ctx.activeModuleId,
    }),
  );
  // `reached`, not `ok`: this endpoint answers an empty area with `status: 0`
  // and a message, which is a real answer and the one the client would get.
  // Seeding it is what stops the skeleton flashing on a page with no brands.
  if (!reached(body)) return {};
  return {
    brands: {
      data: ok(body) ? body!.data ?? [] : [],
      total: ok(body) ? body!.total ?? 0 : 0,
      light: body!.brand_background_color_light_theme ?? null,
      dark: body!.brand_background_color_dark_theme ?? null,
    },
  };
};

/** `/sellers` — note the client sends no limit/offset here, so neither do we. */
export const loadSellers = async (ctx: RequestContext) => {
  if (!ctx.city?.latitude) return {};
  const body = await safe("sellers", () =>
    serverGet<ApiResponse<Seller[]>>("sellers", {
      params: { latitude: ctx.city?.latitude, longitude: ctx.city?.longitude },
      lang: ctx.lang,
      moduleId: ctx.activeModuleId,
    }),
  );
  return ok(body) ? { sellers: body!.data ?? [] } : {};
};

/** `/countries`. */
export const loadCountries = async (ctx: RequestContext) => {
  if (!ctx.city?.latitude) return {};
  const body = await safe("countries", () =>
    serverGet<ApiResponse<Country[]> & {
      country_background_color_light_theme?: string | null;
      country_background_color_dark_theme?: string | null;
    }>("countries", {
      params: {
        limit: COUNTRIES_PER_PAGE,
        offset: 0,
        latitude: ctx.city?.latitude,
        longitude: ctx.city?.longitude,
      },
      lang: ctx.lang,
      moduleId: ctx.activeModuleId,
    }),
  );
  if (!ok(body)) return {};
  return {
    countries: {
      data: body!.data ?? [],
      light: body!.country_background_color_light_theme ?? null,
      dark: body!.country_background_color_dark_theme ?? null,
    },
  };
};


// ── Phase 6: the catalogue ───────────────────────────────────────────────────
//
// These pages fetch through React Query, so the natural tool would be
// `dehydrate`. It is NOT used here. Their query keys embed the whole redux
// filter object, a debounce hook's output and a router-derived category
// (ProductsList.tsx:194-202), and reproducing that key byte for byte on the
// server is precisely the silent-failure mode SSR_PLAN.md §7.5 exists to catch:
// one wrong member and the client quietly refetches while the page still looks
// right.
//
// Instead the loader supplies the FIRST PAGE as React Query `initialData`. The
// component computes its own key exactly as it always has, and `initialData`
// seeds whichever key that turns out to be — so a key mismatch is impossible by
// construction rather than by careful copying.

/** Matches ProductsList.tsx:76 — `grid_view` defaults true in the slice. */
const PRODUCTS_PER_PAGE_GRID = 30;

/**
 * `/products` — the unfiltered first page, which is what a fresh visit shows.
 *
 * Deliberately only the no-filter case: a request carrying filters in the URL is
 * left to the client, because the server would have to replay the whole redux
 * filter state to get the same list.
 */
export const loadProducts = async (ctx: RequestContext) => {
  if (!ctx.city?.latitude) return {};
  const body = await safe("products", () =>
    serverPostForm<{ status?: number | string; data: Product[]; total?: number }>(
      "products",
      {
        latitude: ctx.city?.latitude,
        longitude: ctx.city?.longitude,
        limit: PRODUCTS_PER_PAGE_GRID,
        offset: 0,
      },
      { lang: ctx.lang, moduleId: ctx.activeModuleId },
    ),
  );
  if (!ok(body)) return {};
  return { products: { ...body!, data: stripSellerContact(body!.data) } };
};

/**
 * `product/[slug]` — the product itself.
 *
 * Seeded as React Query `initialData` for the same reason as the listing: the
 * component's key embeds the whole language object (ProductDetail.tsx:166) and
 * reproducing it here would be another chance to get it subtly wrong.
 */
export const loadProductDetail = async (slug: string, ctx: RequestContext) => {
  if (!ctx.city?.latitude) return {};
  const { body, moduleId } = await inAnyModule<{ status?: number | string; data: Product }>(
    "product_detail",
    ctx,
    (searchModuleId) =>
      serverPostForm<{ status?: number | string; data: Product }>(
        "product_by_id",
        {
          latitude: ctx.city?.latitude,
          longitude: ctx.city?.longitude,
          slug,
        },
        { lang: ctx.lang, moduleId: searchModuleId },
      ),
  );
  // NO 404 for products, deliberately.
  //
  // `product_by_id` answers `status: 0` both for a slug that does not exist and
  // for one that is simply not visible in the current module/city context —
  // verified against the live API, which returns `status: 0` for a real product
  // under every module id including none. There is therefore no reliable
  // server-side way to tell "missing" from "not here", and guessing wrong 404s a
  // REAL product. An earlier attempt did exactly that: it inferred absence from
  // the SEO lookup and 404'd every product without an SEO record — nearly the
  // whole catalogue — which the visual suite caught.
  //
  // A soft 404 on a genuinely dead product URL is a minor SEO cost. 404ing live
  // products is a revenue cost. So the page keeps answering 200 and the client
  // shows its own "not found", exactly as before. Blogs still 404 properly,
  // because `blogs?slug=` is module-agnostic and gives a trustworthy answer.
  if (!ok(body)) return {};
  // Pin the module the product actually lives in, so the header, the catalogue
  // and the prices around it match the product the visitor opened.
  return String(moduleId) === String(ctx.activeModuleId)
    ? { product: body }
    : { product: body, [MODULE_OVERRIDE]: moduleId };
};


// ── Phase 6: /categories/[...slug] ───────────────────────────────────────────
//
// This route has TWO FLOWS and both must keep working. There is no if/else in
// the component: CategoryDetail ALWAYS renders the product list and only
// prepends the sub-category swiper when the children call came back non-empty
// (CategoryDetail.tsx:361, SubCategorySwiper.tsx:41).
//
//   flow 1  parent slug -> children returned -> swiper above the products
//   flow 2  leaf slug   -> no children       -> products only
//
// THE TRAP, verified against the live API:
//   parent `fruits-vegetables`     -> status 1, total 4, 4 children
//   leaf   `grocery-fresh-produce` -> status 0, "No Category Found!"
//
// There is no status-1-with-empty-data case. So the project's usual `ok()` rule
// would withhold the children seed on EVERY leaf, every flow-2 page would refetch
// call A on mount, and the swiper area would flicker — the precise regression the
// two-flow rule exists to prevent.
//
// Hence a deliberate, narrow exception: the children call seeds on status 0 as
// well as status 1, because here status 0 is a legitimate answer ("this category
// is a leaf"), not a failure. A thrown request still seeds nothing, so a genuine
// outage degrades to the client fetch as everywhere else.
const CATEGORY_CHILDREN_LIMIT = 12;
const CATEGORY_PRODUCTS_LIMIT = 12;

export const loadCategoryDetail = async (slugArr: string[], ctx: RequestContext) => {
  const isAll = slugArr[0] === "all";
  const currentSlug = slugArr[slugArr.length - 1];

  // The all-categories grid is a different component with a single call.
  if (isAll) {
    const body = await safe("categories_all", () =>
      serverGet<ApiResponse<unknown[]>>("categories", {
        params: { limit: 18, offset: 0 },
        lang: ctx.lang,
        moduleId: ctx.activeModuleId,
      }),
    );
    return ok(body) ? { allCategories: body } : {};
  }

  if (!currentSlug) return {};

  // The category's own record decides which module this page belongs to, for the
  // same reason a product does: `/categories/<slug>` carries no module, so a
  // visitor arriving with another module's cookie would otherwise get an empty
  // page. Resolved first, then everything else is fetched under that module.
  const { body: own, moduleId, answeredEverywhere } = await inAnyModule<ApiResponse<unknown>>(
    "category_own",
    ctx,
    (searchModuleId) =>
      serverGet<ApiResponse<unknown>>("categories", {
        params: { slug: currentSlug, is_own_data: 1 },
        lang: ctx.lang,
        moduleId: searchModuleId,
      }),
  );

  // A real 404 for a slug no module knows. Unlike products, the category
  // lookup is not city-scoped, so `status: 0` from EVERY module means it does
  // not exist — checked against the live API: all 27 sitemap categories
  // resolve in some module, an invented slug answers 0 in all four. An outage
  // (any call threw) is not proof, so it keeps the client fetch.
  if (!ok(own) && answeredEverywhere && (ctx.modules?.length ?? 0) > 0) {
    return { __notFound: true };
  }

  const [children, products] = await Promise.all([
    safe("category_children", () =>
      serverGet<ApiResponse<unknown[]>>("categories", {
        params: { limit: CATEGORY_CHILDREN_LIMIT, offset: 0, slug: currentSlug },
        lang: ctx.lang,
        moduleId,
      }),
    ),
    ctx.city?.latitude
      ? safe("category_products", () =>
          serverPostForm<{ status?: number | string; data: Product[]; total?: number }>(
            "products",
            {
              latitude: ctx.city?.latitude,
              longitude: ctx.city?.longitude,
              limit: CATEGORY_PRODUCTS_LIMIT,
              offset: 0,
              category_slug: currentSlug,
            },
              { lang: ctx.lang, moduleId },
          ),
        )
      : Promise.resolve(undefined),
  ]);

  const data: Record<string, unknown> = {};
  // The exception described above: seeded whenever the request itself succeeded.
  if (children !== undefined) {
    data.categoryChildren = { data: children.data ?? [], total: children.total ?? 0 };
  }
  if (ok(own)) data.categoryOwn = own!.data ?? null;
  if (ok(products)) data.categoryProducts = { ...products!, data: stripSellerContact(products!.data) };
  if (ok(own) && String(moduleId) !== String(ctx.activeModuleId)) data[MODULE_OVERRIDE] = moduleId;
  return data;
};


/**
 * `/` — the whole homepage comes from one `shop` call.
 *
 * Returns the UNWRAPPED payload, because Homepage's queryFn returns
 * `response?.data` (Homepage.tsx:53) and the body reads it from redux, not from
 * the query. `withSsr` therefore both seeds redux with this and hands it back as
 * React Query `initialData` — see the note there.
 */
export const loadHome = async (ctx: RequestContext) => {
  if (!ctx.city?.latitude) return {};
  const body = await safe("shop", () =>
    serverGet<ApiResponse<ShopData>>("shop", {
      params: { latitude: ctx.city?.latitude, longitude: ctx.city?.longitude },
      lang: ctx.lang,
      moduleId: ctx.activeModuleId,
    }),
  );
  return ok(body) ? { shop: body!.data } : {};
};
