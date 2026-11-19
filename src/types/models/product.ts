// Product-shaped API models: products, variants, attributes, images, food
// add-ons, ratings/reviews and product SEO.
//
// Fields are derived from what the app actually reads/writes. Types only — no
// runtime code.

import type { DateString, Flag, Id, Nullable, Numeric, Url } from "../common";
import type { Seller } from "./catalog";

// ── Shared bits ─────────────────────────────────────────────────────────────

/** `translations` block on products (localized copy wins over flat fields). */
export interface ProductTranslations {
  name?: Nullable<string>;
  /** HTML; rendered with dangerouslySetInnerHTML on the product page. */
  description?: Nullable<string>;
}

/**
 * One gallery entry. Product detail sends plain URL strings, listings send
 * objects — always read through `normalizeImage` (src/utils/variantUtils.js).
 */
export type ProductImage = Url | ProductImageObject;

export interface ProductImageObject {
  id?: Id;
  image_url?: Nullable<Url>;
  url?: Nullable<Url>;
  src?: Nullable<Url>;
  image?: Nullable<Url>;
}

/** Stock unit on legacy (measurement-based) variants and cart rows. */
export interface ProductUnit {
  translations?: {
    name?: Nullable<string>;
    /** e.g. "kg", "PC" — appended to `measurement` in variant labels. */
    short_code?: Nullable<string>;
  };
}

// ── Variants & attributes ───────────────────────────────────────────────────

/** Display type of a variant attribute. Anything else renders as a text chip. */
export type VariantAttributeType = "color" | "image" | (string & {});

export interface VariantAttribute {
  id: Id;
  type?: Nullable<VariantAttributeType>;
  translations?: {
    name?: Nullable<string>;
  };
}

/**
 * One value in `variant.attribute_values`. The API can repeat the same value
 * per variant (join duplication) — read through `getAttributeValues`.
 */
export interface VariantAttributeValue {
  id: Id;
  attribute_id?: Id;
  value?: Nullable<string>;
  /**
   * Display text with the unit already in it ("100 GM"). `value` alone drops
   * the unit ("100"), so pills prefer this (WEB_PARITY_V4.0.2 §1.6) and fall
   * back to `value` + `short_code`.
   */
  label?: Nullable<string>;
  /** Unit suffix, e.g. `500` + `"ml"`. */
  short_code?: Nullable<string>;
  /** Swatch colour for `type: "color"` attributes. */
  color_code?: Nullable<string>;
  /** Some backends echo the product cover here as a lazy default. */
  image_url?: Nullable<Url>;
  /** Chip order within an attribute; missing treated as 0. */
  sequence?: number;
  attribute?: Nullable<VariantAttribute>;
}

export interface ProductVariant {
  id: Id;
  price?: Numeric;
  /** `0` means no discount (compared with `!== 0`). */
  discounted_price?: Numeric;
  stock?: Numeric;
  is_unlimited_stock?: Flag;
  /** Inactive variants (`0`) are hidden/blocked. */
  status?: Flag;
  /** Compared with `== true`. */
  few_quantity_left?: Flag;
  /** Legacy label: `${measurement} ${stock_unit_name || unit.short_code}`. */
  measurement?: Numeric;
  stock_unit_name?: Nullable<string>;
  unit?: Nullable<ProductUnit>;
  /** Present on multi-attribute products; empty/absent on legacy variants. */
  attribute_values?: VariantAttributeValue[];
  images?: ProductImage[];
}

/** `{ [attributeId]: attributeValueId }` — see `getVariantSelection`. */
export type VariantSelection = Record<string, Id>;

/** One option in the attribute matrix built by `buildAttributes`. */
export interface VariantAttributeOption {
  id: Id;
  value?: Nullable<string>;
  short_code?: Nullable<string>;
  color_code?: Nullable<string>;
  image_url?: Nullable<Url>;
  sequence: number;
}

/** Attribute matrix entry returned by `buildAttributes(variants)`. */
export interface VariantAttributeGroup {
  id: Id;
  name?: Nullable<string>;
  type?: Nullable<VariantAttributeType>;
  values: VariantAttributeOption[];
}

// ── Food add-ons ────────────────────────────────────────────────────────────

/** Unknown/absent values fall back to "multiple" (see `getSelectionType`). */
export type AddonSelectionType = "single" | "multiple";

export interface AddonTranslations {
  name?: Nullable<string>;
  sub_title?: Nullable<string>;
}

/** One pickable add-on option inside an `AddonGroup`. */
export interface AddonOption {
  id: Id;
  /** Usually null — the name lives under `translations`. */
  name?: Nullable<string>;
  translations?: AddonTranslations;
  /** Only `1` renders. */
  status?: Flag;
  price?: Numeric;
  /** `null` = no discount; `0` = now free. Never collapse null to 0. */
  discounted_price?: Nullable<Numeric>;
}

/** Alias kept for readability at call sites that talk about "add-ons". */
export type ProductAddon = AddonOption;

/** Add-on group on a food product. Only `product_by_id` returns these. */
export interface AddonGroup {
  id: Id;
  /** Usually null — the name lives under `translations`. */
  name?: Nullable<string>;
  translations?: AddonTranslations;
  /** Only `1` renders. */
  status?: Flag;
  selection_type?: Nullable<AddonSelectionType | (string & {})>;
  /** `0` = unlimited. Ignored for "single" groups (always 1). */
  max_select?: Numeric;
  /** `"paid"` shows the price column; anything else is treated as free. */
  type?: Nullable<string>;
  options?: AddonOption[];
}

/** Customise-sheet picks: `{ [groupId]: optionId[] }`. */
export type AddonSelections = Record<string, Id[]>;

/**
 * An add-on already attached to a cart row (`selected_addons`). Server rows
 * answer the name under `translations`; guest rows are built locally with a
 * flat `name` and the effective `price`.
 */
export interface SelectedAddon {
  id?: Id;
  name?: Nullable<string>;
  translations?: AddonTranslations;
  price?: Numeric;
}

// ── Specifications (custom fields) ──────────────────────────────────────────

/** Definition of a product custom field (labels for `custom_field_values`). */
export interface ProductCustomField {
  id: Id;
  name?: Nullable<string>;
  title?: Nullable<string>;
  /** `"file"` fields carry an image URL as their value. */
  type?: Nullable<string>;
  translations?: {
    name?: Nullable<string>;
  };
}

/** Value of one custom field; multi-select fields arrive as arrays. */
export type ProductCustomFieldValue = Nullable<string | string[]>;

/** Already-labelled specification row (array shape of `custom_field_values`). */
export interface ProductCustomFieldEntry {
  id?: Id;
  name?: Nullable<string>;
  title?: Nullable<string>;
  type?: Nullable<string>;
  value?: ProductCustomFieldValue;
  translations?: {
    name?: Nullable<string>;
    value?: ProductCustomFieldValue;
  };
}

/**
 * `custom_field_values` arrives in two shapes:
 * `{ "2": "snapdragon" }` (keyed by custom-field id) or `[{ id, name, value }]`.
 */
export type ProductCustomFieldValues =
  | Record<string, ProductCustomFieldValue>
  | ProductCustomFieldEntry[];

// ── Product ─────────────────────────────────────────────────────────────────

export interface Product {
  id: Id;
  /** Flat name; prefer `translations.name`. */
  name?: Nullable<string>;
  slug?: string;
  translations?: ProductTranslations;
  /** Raw description; only checked for `!== ""` (HTML comes from translations). */
  description?: Nullable<string>;
  /** Cover image. Empty for variant-only products — use `getProductImage`. */
  image_url?: Nullable<Url>;
  images?: ProductImage[];
  /** Read without optional chaining in places (`product.variants.length`). */
  variants: ProductVariant[];
  /** `0` = inactive. */
  status?: Flag;
  is_unlimited_stock?: Flag;
  /** Per-product cart cap across all variants. */
  total_allowed_quantity?: Numeric;
  /** Only shown when `product_rating == true` and `> 0`. */
  average_rating?: Numeric;
  /** Ratings enabled for this product (`== true`). */
  product_rating?: Flag;
  module_id?: Nullable<Id>;
  /** Owning category; `products` + `category_ids` uses it for replacements (WEB_PARITY_V4.0.2 §1.5). */
  category_id?: Nullable<Id>;
  seller_id?: Id;
  /** `null` hides the seller line. */
  seller_name?: Nullable<string>;
  seller?: Nullable<Seller>;
  /** `""` hides the FSSAI block. */
  fssai_lic_no?: Nullable<string>;
  fssai_lic_img?: Nullable<Url>;
  /** Food-type badge: falsy = none, `1` = veg, anything else = non-veg. */
  indicator?: Nullable<number | string>;
  cancelable_status?: Flag;
  /** Last order status (1–5) up to which the item can still be cancelled. */
  till_status?: number | string;
  return_status?: Flag;
  /** Compared with `=== 1` for singular/plural. */
  return_days?: number;
  /** Comma-separated tags; drives "similar products" (`tag_names` filter). */
  tag_names?: Nullable<string>;
  custom_field_values?: Nullable<ProductCustomFieldValues>;
  /** Legacy name for `custom_field_values`. */
  specifications?: Nullable<ProductCustomFieldValues>;
  custom_fields?: ProductCustomField[];
  /** Food module only, and only on `product_by_id`. */
  addon_groups?: AddonGroup[];
  /** Flat price on some list payloads (search dropdown reads it). */
  price?: Numeric;
  /** Flat price on some list payloads (search dropdown reads it). */
  discounted_price?: Numeric;
}

/** Extra top-level fields on the `products` (getProductByFilter) response. */
export interface ProductListMeta {
  total?: number;
  /** Passed to `parseInt` for the price slider bounds. */
  total_min_price?: Numeric;
  total_max_price?: Numeric;
}

/** `products/get_seo_things` payload (product page SSR metadata). */
export interface ProductSeo {
  meta_title?: Nullable<string>;
  meta_description?: Nullable<string>;
  meta_keywords?: Nullable<string>;
  og_image?: Nullable<Url>;
  favicon?: Nullable<Url>;
  /** Raw markup; parsed with `extractJSONFromMarkup`. */
  schema_markup?: Nullable<string>;
}

// ── Ratings & reviews ───────────────────────────────────────────────────────

export interface ReviewImage {
  /** Sent back in `deleteImageIds` when editing a review. */
  id: Id;
  image_url?: Nullable<Url>;
}

export interface ReviewUser {
  id?: Id;
  name?: Nullable<string>;
  /** Avatar URL. */
  profile?: Nullable<Url>;
}

/** One review in `rating_list`, `item_rating[]`, or `get_product_rating`. */
export interface ProductReview {
  id: Id;
  user_id?: Id;
  user?: Nullable<ReviewUser>;
  /** Star count; compared with `index < rate`. */
  rate?: number;
  review?: Nullable<string>;
  updated_at?: DateString;
  images?: ReviewImage[];
}

/** Alias: the task/API also calls a single review a "rating". */
export type ProductRating = ProductReview;

/** `products/ratings` (getProductRatings) `data` payload. */
export interface ProductRatingSummary {
  /** `.toFixed()` is called on it. */
  average_rating?: number;
  rating_list?: ProductReview[];
  /** Star-bucket counts; summed arithmetically. */
  five_star_rating?: number;
  four_star_rating?: number;
  three_star_rating?: number;
  two_star_rating?: number;
  one_star_rating?: number;
}

/** `rating/image_list` (getProductImages) `data`: plain URL strings. */
export type ProductRatingImages = Url[];
