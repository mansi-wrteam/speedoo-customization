// Cart API models, the Redux cart line shapes, and promo codes.
//
// Fields are derived from what the app actually reads/writes. Types only — no
// runtime code.

import type { Flag, Id, Nullable, Numeric, Url } from "../common";
import type {
  Product,
  ProductUnit,
  SelectedAddon,
  VariantAttributeValue,
} from "./product";

// ── Server cart ─────────────────────────────────────────────────────────────

/**
 * One row of `getCart().data.cart` (also `getGuestCart().data.cart`). With
 * add-ons, `(product_id, product_variant_id)` is not unique — address a row by
 * `cart_id` whenever it is present.
 */
export interface ApiCartItem {
  id?: Id;
  /** Absent on guest rows (`cart/guest_cart`). */
  cart_id?: Id;
  product_id: Id;
  product_variant_id: Id;
  qty: number;
  /** Flat product name (Repeat sheet); the cart list uses `product.translations.name`. */
  name?: Nullable<string>;
  product?: Nullable<Pick<Product, "translations">>;
  image_url?: Nullable<Url>;
  price?: Numeric;
  /** `0` means no discount. */
  discounted_price?: Numeric;
  /** Per-unit sum of the row's add-ons; added to the unit price. */
  addon_price?: Numeric;
  selected_addons?: SelectedAddon[];
  stock?: Numeric;
  is_unlimited_stock?: Flag;
  total_allowed_quantity?: Numeric;
  /** Pharmacy: compared with `== 1`. */
  require_prescription?: Flag;
  /**
   * Row fulfilment state (WEB_PARITY_V4.0.2 §1.5). The string `"0"` means the
   * line can no longer be fulfilled — sold out or switched off. Read it through
   * `isUnavailableRow`, never as a boolean: `"0"` is truthy.
   */
  status?: Flag;
  /**
   * How many OTHER variants the row's product has (§1.6). `> 0` makes the size
   * pill an editable swap control; `0` leaves it a plain label.
   */
  other_variants_count?: Numeric;
  /** Set on product rows; used to fetch same-category replacements (§1.5). */
  category_id?: Id;
  /** Product slug, when the row carries one (deep link to the product page). */
  slug?: Nullable<string>;
  /** `1` when the row's product is already in the customer's favourites (§1.6). */
  is_favorite?: Flag;
  // Variant label fields (`getVariantLabel(row)`).
  measurement?: Numeric;
  stock_unit_name?: Nullable<string>;
  unit?: Nullable<ProductUnit>;
  attribute_values?: VariantAttributeValue[];
  /** Only on guest rows rebuilt locally by `expandGuestRows`. */
  guest_line_id?: string;
}

/** One entry of `CartData.delivery_charge.sellers_info` (checkout). */
export interface SellerDeliveryCharge {
  seller_name?: Nullable<string>;
  delivery_charge?: Numeric;
}

export interface CartDeliveryCharge {
  total_delivery_charge?: Numeric;
  sellers_info?: SellerDeliveryCharge[];
  is_delivery_charges_refundable?: Flag;
}

/** Extra charge line on the checkout summary. */
export interface CartAdditionalCharge {
  title?: Nullable<string>;
  amount?: Numeric;
  is_refundable?: Flag;
}

/** Pickup store shown for self-pickup orders. */
export interface SellerSelfPickup {
  seller_name?: Nullable<string>;
  pickup_store_address?: Nullable<string>;
  pickup_latitude?: Numeric;
  pickup_longitude?: Numeric;
  /** Pickup store phone and opening hours, shown on the checkout pickup card. */
  seller_mobile?: Nullable<string>;
  opening_time?: Nullable<string>;
  closing_time?: Nullable<string>;
}

/**
 * `getCart().data`. With `is_checkout: 1` the same endpoint adds the checkout
 * totals (stored in Redux `Cart.checkout`). `getGuestCart().data` carries the
 * `cart` + `sub_total` subset.
 */
export interface CartData {
  cart?: ApiCartItem[];
  /** `.toFixed()` is called on it (via `Cart.cartSubTotal`). */
  sub_total: number;
  self_pickup_mode?: Flag;
  doorstep_delivery_mode?: Flag;
  /**
   * Set when the cart already holds another seller's items. Only observed on
   * the add-to-cart envelope's `data` (see `AddToCartResponse`).
   */
  one_seller_error_code?: Flag;
  // Checkout (`is_checkout: 1`) fields.
  /** Forwarded as-is to `placeOrder` (`product_variant_id`). */
  product_variant_id?: string | number;
  /** Forwarded as-is to `placeOrder` (`quantity`). */
  quantity?: string | number;
  delivery_charge?: Nullable<CartDeliveryCharge>;
  /** `.toFixed()` is called on it. */
  total_amount?: number;
  additional_charges?: CartAdditionalCharge[];
  promocode_details?: Nullable<{ discount?: Numeric }>;
  /** Compared with `== "1"`. */
  cod_allowed?: Flag;
  /**
   * v4.0.2 §1.7 names this flag `is_cod_allowed`; older payloads send
   * `cod_allowed`. Both are read (see `isCodAllowed`) until the backend
   * confirms which one it sends.
   */
  is_cod_allowed?: Flag;
  seller_self_pickup?: Nullable<SellerSelfPickup>;
}

/**
 * Full `cart/add` (and `cart/remove`) response — the product cards store this
 * whole envelope via `setCart({ data: response })`.
 */
export interface AddToCartResponse {
  /** Compared with `=== 1`. */
  status: number;
  message?: string;
  /** New cart subtotal; `.toFixed()` is called on it downstream. */
  sub_total?: number;
  data?: Nullable<Pick<CartData, "one_seller_error_code">>;
}

export type RemoveFromCartResponse = AddToCartResponse;

/**
 * What Redux `Cart.cart` can hold: the add-to-cart envelope (product cards),
 * `getCart().data` (login / new-user flows), `[]` after clearing, or `null`.
 */
export type StoredCart = Nullable<AddToCartResponse | CartData | never[]>;

// ── Redux cart lines ────────────────────────────────────────────────────────

/** Item of Redux `Cart.cartProducts` (logged-in cart mirror). */
export interface CartLine {
  product_id: Id;
  product_variant_id: Id;
  qty: number;
  /** Present when mirrored from `getCart`; absent on optimistic card adds. */
  cart_id?: Id;
  selected_addons?: SelectedAddon[];
  addon_price?: Numeric;
  price?: Numeric;
  discounted_price?: Numeric;
}

/** Item of Redux `Cart.guestCart` (device-local cart). */
export interface GuestCartLine {
  product_id: Id;
  product_variant_id: Id;
  qty: number;
  /** Effective variant unit price (discounted if any), add-ons excluded. */
  productPrice: Numeric;
  /**
   * Guest cart spans modules; filtered by the active module. Optional because
   * guest carts persisted before module support (June 2026, e8977f9) have no
   * module_id and still rehydrate from localStorage.
   */
  module_id?: Nullable<Id>;
  // Food add-on lines only (all four set together).
  /** Locally minted (`g_<ts>_<rand>`) — the same variant can repeat. */
  guest_line_id?: string;
  selected_addon_ids?: Id[];
  /** Per-unit add-on total. */
  addon_price?: number;
  /** Resolved `{ id, name, price }` — `guest_cart` never echoes add-ons. */
  selected_addons?: SelectedAddon[];
}

// ── Promo codes ─────────────────────────────────────────────────────────────

/** One offer from `getPromo().data` (coupon drawer list). */
export interface PromoCode {
  id: Id;
  promo_code?: string;
  image_url?: Nullable<Url>;
  translations?: {
    message?: Nullable<string>;
  };
  /** Server-owned (expiry, caps, per-user limits). Compared `== 1` / `=== "1"`. */
  is_applicable?: Flag;
  /** Optional; can arrive as the string `"null"`. */
  min_order_amount?: Nullable<Numeric>;
  /** Cart total after this coupon (savings shown as subtotal − this); wrapped in `Number()`. */
  discounted_amount?: Numeric;
}

/** `setPromoCode().data`, stored in Redux `Cart.promo_code`. */
export interface AppliedPromoCode {
  promo_code: string;
  /** Sent as `promocode_id` to getCart/placeOrder. */
  promo_code_id: Id;
  /** `.toFixed()` is called on it and it is subtracted from the subtotal. */
  discount: number;
}
