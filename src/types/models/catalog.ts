// Catalog API models: categories, brands, sellers, countries, home sections,
// sliders, offers and the `/shop` home payload (Redux `Shop.shop`).
//
// Fields are derived from what the app actually reads/writes. Types only — no
// runtime code.

import type { Flag, Id, Nullable, Url } from "../common";
import type { Product } from "./product";

// ── Shared bits ─────────────────────────────────────────────────────────────

export interface NameTranslations {
  name?: Nullable<string>;
}

/**
 * Per-item card colours read by `resolveCardBg` (src/lib/utils.js). Empty,
 * `"transparent"` and `"#00000000"` fall back to the list-level colour.
 */
export interface CardBackgroundColors {
  background_color_for_light_theme?: Nullable<string>;
  background_color_for_dark_theme?: Nullable<string>;
}

/** List-level category card colours (on `/shop` and the `categories` response). */
export interface CategoryBackgroundSettings {
  /** Passed to `resolveCardBg` as `mode`, which currently ignores it. */
  category_background_color_mode?: unknown;
  category_background_color_light_theme?: Nullable<string>;
  category_background_color_dark_theme?: Nullable<string>;
}

/** List-level brand card colours (on `/shop` and the `brands` response). */
export interface BrandBackgroundSettings {
  /** Passed to `resolveCardBg` as `mode`, which currently ignores it. */
  brand_background_color_mode?: unknown;
  brand_background_color_light_theme?: Nullable<string>;
  brand_background_color_dark_theme?: Nullable<string>;
}

/** List-level country card colours (on `/shop` and the `countries` response). */
export interface CountryBackgroundSettings {
  /** Passed to `resolveCardBg` as `mode`, which currently ignores it. */
  country_background_color_mode?: unknown;
  country_background_color_light_theme?: Nullable<string>;
  country_background_color_dark_theme?: Nullable<string>;
}

// ── Category ────────────────────────────────────────────────────────────────

export interface Category extends CardBackgroundColors {
  id: Id;
  /** Used unguarded to build `/categories/${slug}`. */
  slug: string;
  /** Flat name; prefer `translations.name`. */
  name?: Nullable<string>;
  translations?: NameTranslations;
  image_url?: Nullable<Url>;
  /** Compared with `== true` / `=== true` to pick subcategory page vs listing. */
  has_child?: Flag;
  /** Active subcategories (recursive) — drives the filter tree. */
  cat_active_childs?: Category[];
}

/** `categories/get_seo_things` payload (category page SSR metadata). */
export interface CategorySeo {
  translations?: {
    meta_title?: Nullable<string>;
    meta_description?: Nullable<string>;
    meta_keywords?: Nullable<string>;
    /** Raw markup; parsed with `extractJSONFromMarkup`. */
    schema_markup?: Nullable<string>;
  };
  og_image?: Nullable<Url>;
  favicon?: Nullable<Url>;
}

// ── Brand / Seller / Country ────────────────────────────────────────────────

export interface Brand extends CardBackgroundColors {
  id: Id;
  name?: Nullable<string>;
  translations?: NameTranslations;
  image_url?: Nullable<Url>;
}

export interface SellerTranslations {
  name?: Nullable<string>;
  store_name?: Nullable<string>;
}

export interface Seller {
  id: Id;
  name?: Nullable<string>;
  translations?: SellerTranslations;
  logo_url?: Nullable<Url>;
  total_products?: number;
}

export interface Country extends CardBackgroundColors {
  id: Id;
  name?: Nullable<string>;
  translations?: NameTranslations;
  /** Storage-relative path, rendered as `${API_URL}/storage/${logo}`. */
  logo?: Nullable<string>;
}

// ── Home: sections, sliders, offers ─────────────────────────────────────────

/** Where a section/offer is placed on the home page. */
export type HomePosition =
  | "top"
  | "below_slider"
  | "below_category"
  | "below_section"
  | "custom_below_shop_by_brands"
  | "below_shop_by_country_of_origin"
  | "below_shop_by_seller"
  | (string & {});

/** Web layout of a home section. */
export type SectionStyle =
  | "style_1"
  | "style_2"
  | "style_3"
  | "style_4"
  | (string & {});

export interface SectionTranslations {
  title?: Nullable<string>;
  short_description?: Nullable<string>;
}

/** A featured product section on the home page (`shop.sections[]`). */
export interface Section extends CardBackgroundColors {
  id: Id;
  position?: HomePosition;
  style_web?: SectionStyle;
  translations?: SectionTranslations;
  /** e.g. `"recently_visited_products"` (patched client-side after a visit). */
  product_type?: Nullable<string>;
  products?: Product[];
  product_ids?: Id[];
  /** Side banner for `style_4`. */
  banner_web_url?: Nullable<Url>;
}

/** Click target of a slider/offer. */
export type PromoLinkType =
  | "product"
  | "category"
  | "slider_url"
  | (string & {});

/** Home hero slide (`shop.sliders[]`). */
export interface Slider {
  id?: Id;
  /** Read unguarded (`slide.image_url`). */
  image_url: Url;
  type?: PromoLinkType;
  /** Product or category slug to navigate to. */
  type_slug?: Nullable<string>;
  /** Category id for the listing filter (`.toString()` is called on it). */
  type_id?: Id;
  /** External link when `type === "slider_url"`. */
  slider_url?: Nullable<Url>;
  category_data?: Nullable<Pick<Category, "has_child">>;
}

/** Promotional banner (`shop.offers[]`). */
export interface Offer {
  id: Id;
  position?: HomePosition;
  image_url?: Nullable<Url>;
  type?: PromoLinkType;
  type_slug?: Nullable<string>;
  /** External link, opened when `type` is neither product nor category. */
  offer_url?: Nullable<Url>;
  product?: Nullable<Pick<Product, "slug">>;
  category?: Nullable<Pick<Category, "id" | "has_child">>;
  /** Set for `position: "below_section"` — the section it follows. */
  section?: Nullable<Pick<Section, "id">>;
}

// ── /shop payload ───────────────────────────────────────────────────────────

/** `getShop().data`, stored in Redux as `Shop.shop`. */
export interface ShopData
  extends CategoryBackgroundSettings,
    BrandBackgroundSettings,
    CountryBackgroundSettings {
  sliders?: Slider[];
  offers?: Offer[];
  sections?: Section[];
  categories?: Category[];
  brands?: Brand[];
  sellers?: Seller[];
  countries?: Country[];
}
