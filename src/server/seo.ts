// EGROCER_SERVER_ONLY
//
// The SEO fetch, once. It used to be copy-pasted into 15 pages. See SSR_PLAN.md
// §3.3 and the phase 2 section of §6.
//
// The 15 copies were only NEAR-identical, and the differences are preserved here
// rather than tidied away, because this phase must not change a single tag.
// migration-baseline/tests/seo pins all 57 cases, including the ones below that
// look like mistakes. Where behaviour differs between pages it is spelled out in
// a `SettingsSeoVariant` and the odd ones carry a PRESERVED QUIRK note.
//
// The three differences among the 11 settings-driven pages:
//
//   imageSource   FIXED (was D3). Three pages read `translations.og_image_url`
//                 and eight read the TOP LEVEL of the same payload from the same
//                 endpoint, so at most one group could ever be right. Every page
//                 now PREFERS `translations.*` and falls back to the top level,
//                 which is correct whichever one the admin eventually populates.
//                 Note the real blocker is upstream: `settings/get_seo_settings`
//                 currently returns NO entry for any page_type, so no settings
//                 page can render an og:image until SEO records are created in
//                 the admin panel. The code is no longer the thing in the way.
//
//   defaultOgImage  `null` for home and blogs, `""` for the other nine.
//
//   blankFallsBack  Every page except terms-and-conditions treats a blank admin
//                 value as "use the env default" (`value || default`).
//                 terms-and-conditions assigns it straight through, so a blank
//                 SEO title there produces an EMPTY <title>.
//                 PRESERVED QUIRK — see the `blank` cases in the fixture.
import { extractJSONFromMarkup } from "@/utils/helperFunction";
import { assertServerOnly } from "./assertServerOnly";
import { serverGet } from "./http";
import type { SeoApiBody } from "@/types/api";
import type { CategorySeo, ProductSeo, SeoSettings, Blog } from "@/types/models";
import type { DetailSeoProps, ProductSeoProps, SeoProps } from "@/types/seo";

assertServerOnly("server/seo");

const SETTINGS_ENDPOINT = "settings/get_seo_settings";
const PRODUCT_ENDPOINT = "products/get_seo_things";
const CATEGORY_ENDPOINT = "categories/get_seo_things";
const BLOG_ENDPOINT = "blogs";

type Lang = string | string[] | undefined;

/**
 * The env-provided defaults every page falls back to. Read per call, not once,
 * so a stubbed env in tests is picked up.
 *
 * FIXED (was D5): only home and blogs used to write `env || null`; the other
 * thirteen passed the raw value, which is `undefined` when the var is unset — and
 * Next refuses to serialize an undefined prop, so those pages failed to render at
 * all on a deployment missing NEXT_PUBLIC_META_*. Every page now coerces to null.
 * `toNull` is kept so the per-page flag still reads explicitly.
 */
const envDefaults = (toNull = true) => {
  const title = process.env.NEXT_PUBLIC_META_TITLE;
  const description = process.env.NEXT_PUBLIC_META_DESCRIPTION;
  const keywords = process.env.NEXT_PUBLIC_META_KEYWORDS;
  return toNull
    ? { title: title || null, description: description || null, keywords: keywords || null }
    : { title, description, keywords };
};

/** JSON-LD string for MetaData, or the page's own "nothing" value. */
const toSchemaString = (markup: string | null | undefined, whenAbsent: string | null) => {
  if (!markup) return whenAbsent;
  const extracted = extractJSONFromMarkup(markup);
  return extracted ? JSON.stringify(extracted) : whenAbsent;
};

// ── Settings-driven pages ────────────────────────────────────────────────────

export interface SettingsSeoVariant {
  /** The `page_type` the admin panel stores this page's SEO entry under. */
  pageType: string;
  /** What `ogImage` is when there is no entry, or the request fails. */
  defaultOgImage: "" | null;
  /** false only for terms-and-conditions: a blank value is passed through. */
  blankFallsBack: boolean;
  /** true only for home and blogs: an unset env default becomes null, not undefined. */
  envDefaultsToNull: boolean;
}

/** One entry per settings-driven page, matching what each page did inline. */
export const SETTINGS_SEO: Record<string, SettingsSeoVariant> = {
  home: { pageType: "Home", defaultOgImage: null, blankFallsBack: true, envDefaultsToNull: true },
  blogs: {
    pageType: "Blog Listing Page",
    defaultOgImage: null,
    blankFallsBack: true, envDefaultsToNull: true,
  },
  "contact-us": {
    pageType: "Contact us",
    defaultOgImage: "",
    blankFallsBack: true, envDefaultsToNull: true,
  },
  "about-us": { pageType: "About us", defaultOgImage: "", blankFallsBack: true, envDefaultsToNull: true },
  products: {
    pageType: "Product listing page",
    defaultOgImage: "",
    blankFallsBack: true, envDefaultsToNull: true,
  },
  faqs: { pageType: "Faqs", defaultOgImage: "", blankFallsBack: true, envDefaultsToNull: true },
  "privacy-policy": {
    pageType: "Privacy policy",
    defaultOgImage: "",
    blankFallsBack: true, envDefaultsToNull: true,
  },
  "terms-and-conditions": {
    pageType: "Term condition",
    defaultOgImage: "",
    // FIXED (was D4): this page alone used to assign blanks straight through, so
    // a blank SEO title saved in the admin produced an empty <title>. It now
    // falls back to the env default like the other ten.
    blankFallsBack: true, envDefaultsToNull: true,
  },
  "shipping-policy": {
    pageType: "Shipping policy",
    defaultOgImage: "",
    blankFallsBack: true, envDefaultsToNull: true,
  },
  "return-and-exchange-policy": {
    pageType: "Return exchange policy",
    defaultOgImage: "",
    blankFallsBack: true, envDefaultsToNull: true,
  },
  "cancellation-policy": {
    pageType: "Cancellation policy",
    defaultOgImage: "",
    blankFallsBack: true, envDefaultsToNull: true,
  },
};

const settingsFallback = (variant: SettingsSeoVariant): SeoProps => ({
  ...envDefaults(variant.envDefaultsToNull),
  schemaMarkup: null,
  ogImage: variant.defaultOgImage,
  favicon: null,
});

/** Fetches and maps a settings-driven page's SEO entry. Never throws. */
export const fetchSettingsSeo = async (
  routeId: keyof typeof SETTINGS_SEO | string,
  lang: Lang,
): Promise<SeoProps> => {
  const variant = SETTINGS_SEO[routeId];
  if (!variant) throw new Error(`server/seo: no SEO variant registered for "${routeId}"`);

  const fallback = settingsFallback(variant);

  try {
    const body = await serverGet<SeoApiBody<SeoSettings[]>>(SETTINGS_ENDPOINT, {
      params: { page_type: variant.pageType },
      lang,
    });

    const entries = body.data ?? [];
    if (!((entries.length as number) > 0)) return fallback;

    const entry = entries[0];
    const translations = entry?.translations;
    // Prefer the translated value, fall back to the top level. Previously each
    // page looked at exactly one of these and ignored the other.
    const imageField = <K extends "og_image_url" | "favicon">(key: K) =>
      (translations as Record<string, unknown> | undefined)?.[key] ??
      (entry as Record<string, unknown> | undefined)?.[key];

    // `||` keeps the env default when the admin value is blank — except on the
    // one page that historically did not.
    const pick = <T>(value: T | undefined | null, otherwise: T | undefined) =>
      variant.blankFallsBack ? value || otherwise : (value as T);

    return {
      title: pick(translations?.meta_title, fallback.title),
      description: pick(translations?.meta_description, fallback.description),
      // The settings pages read the SINGULAR `meta_keyword`.
      keywords: pick(translations?.meta_keyword, fallback.keywords),
      // No trailing `?? defaultOgImage`: terms-and-conditions assigns the raw
      // value, so when the entry has no image this must stay `undefined` rather
      // than becoming "". `pick` already applies the default for the other ten.
      ogImage: pick(imageField("og_image_url") as string | null | undefined, variant.defaultOgImage),
      favicon: pick(imageField("favicon") as string | null | undefined, undefined) || null,
      schemaMarkup: toSchemaString(translations?.schema_markup, null),
    };
  } catch (error) {
    console.log("error", error);
    return fallback;
  }
};

// ── Detail pages ─────────────────────────────────────────────────────────────

/** `product/[slug]`. Uses the API values only when all three meta fields exist. */
export const fetchProductSeo = async (
  slug: string,
  lang: Lang,
): Promise<ProductSeoProps> => {
  const env = envDefaults();
  try {
    const body = await serverGet<SeoApiBody<ProductSeo>>(PRODUCT_ENDPOINT, {
      params: { slug },
      lang,
    });
    const seo = body.data;
    const complete =
      seo?.meta_title != null && seo?.meta_description != null && seo?.meta_keywords != null;

    if (!complete) {
      return {
        slug,
        title: env.title,
        description: env.description,
        keywords: env.keywords,
        og_image: null,
        schemaMarkup: null,
        favicon: null,
      };
    }

    return {
      slug,
      title: seo!.meta_title!,
      description: seo!.meta_description!,
      keywords: seo!.meta_keywords!,
      og_image: seo?.og_image ?? null,
      schemaMarkup: toSchemaString(seo?.schema_markup, null),
      favicon: seo?.favicon ? seo.favicon : null,
    };
  } catch (error) {
    console.log("error", error);
    // A failed lookup renders the default meta rather than a 500.
    return {
      slug,
      title: env.title,
      description: env.description,
      keywords: env.keywords,
      og_image: null,
      schemaMarkup: null,
      favicon: null,
    };
  }
};

/** `categories/[...slug]`. The "all" grid has no SEO entry and is not fetched. */
export const fetchCategorySeo = async (
  slugArr: string[],
  lang: Lang,
): Promise<DetailSeoProps<string[]>> => {
  const env = envDefaults();
  const currentSlug = slugArr[slugArr.length - 1];

  const result: DetailSeoProps<string[]> = {
    slug: slugArr,
    metaTitle: env.title,
    metaDescription: env.description,
    metaKeywords: env.keywords,
    markUpSchema: "",
    og_image: null,
    favicon: null,
  };

  if (!currentSlug || currentSlug === "all") return result;

  try {
    const body = await serverGet<SeoApiBody<CategorySeo>>(CATEGORY_ENDPOINT, {
      params: { slug: currentSlug },
      lang,
    });
    const seo: CategorySeo = body?.data || {};
    result.metaKeywords = seo?.translations?.meta_keywords || result.metaKeywords;
    result.metaTitle = seo?.translations?.meta_title || result.metaTitle;
    result.metaDescription = seo?.translations?.meta_description || result.metaDescription;
    result.og_image = seo?.og_image || null;
    result.favicon = seo?.favicon || null;
    // PRESERVED QUIRK: the extracted object is stringified, then the page passes
    // the string on as `structuredData` — same as before.
    result.markUpSchema = toSchemaString(seo?.translations?.schema_markup, "") ?? "";
  } catch (error) {
    console.error("Error fetching category SEO data:", error);
  }

  return result;
};

/** `blog/[slug]`. A missing post is a real 404, which is why this can return null. */
export const fetchBlogSeo = async (
  slug: string,
  lang: Lang,
): Promise<DetailSeoProps | null> => {
  const env = envDefaults();
  try {
    const body = await serverGet<SeoApiBody<Blog[]>>(BLOG_ENDPOINT, {
      params: { slug },
      lang,
    });
    const entries = body?.data || [];
    // No blog with this slug: the caller turns this into notFound.
    if (!entries.length) return null;

    const blog = entries[0];
    return {
      slug,
      metaKeywords: blog?.translations?.meta_keywords || env.keywords,
      metaTitle: blog?.translations?.meta_title || env.title,
      metaDescription: blog?.translations?.meta_description || env.description,
      markUpSchema: toSchemaString(blog?.translations?.schema_markup, "") ?? "",
      og_image: blog?.image_url || null,
      favicon: blog?.favicon ? blog.favicon : null,
    };
  } catch (error) {
    console.error("Error fetching product data:", error);
    return null;
  }
};
