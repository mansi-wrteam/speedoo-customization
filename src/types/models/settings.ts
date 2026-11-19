// App-wide settings. `settings` and `payment_methods` arrive base64-encoded
// JSON (`JSON.parse(atob(res.data))` in Layout.jsx) and are stored in Redux
// `Setting.setting` / `Setting.payment_setting`. Most scalar values are strings
// (`popup_enabled === "1"`, `is_android_app !== "0"`), hence `Flag` / `Numeric`.

import type { Flag, Id, Numeric, Nullable, Url } from "../common";

export interface SocialMediaLink {
  id: Id;
  name?: string;
  link?: Url;
  image_url?: Url;
}

/** `setting.default_city` — `null` when the admin configured no default city. */
export interface DefaultCity {
  latitude?: Numeric;
  longitude?: Numeric;
}

/** `setting.popup_type`, as branched on by HomeOfferModal. */
export type PopupType = "product" | "category" | "popup_url";

export interface WebSettings {
  site_title?: string;
  web_logo?: Url;
  /** Storage path or absolute URL; resolved by `resolveLogoUrl` (lib/utils.js). */
  dark_web_logo?: string;
  placeholder_image?: Url;
  /** Brand colour (hex); only used as the Razorpay checkout theme colour. */
  color?: string;
  /** `1` = site is in maintenance mode. */
  website_mode?: Flag;
  /** Message shown on the maintenance page. */
  website_mode_remark?: string;
  app_title?: string;
  app_short_description?: string;
  copyright_details?: string;
  /** `"0"` hides the Play Store badge. */
  is_android_app?: Flag;
  android_app_url?: Url;
  play_store_logo?: Url;
  /** `"0"` hides the App Store badge. */
  is_ios_app?: Flag;
  ios_app_url?: Url;
  ios_store_logo?: Url;
}

/**
 * Realtime broadcast config (WEB_PARITY_V4.0.2 §3.1).
 *
 * Trap 6: this object is a SIBLING of `data` in the `customer/settings`
 * response, not a field inside the base64 payload — decoding `data` and
 * looking for it there finds nothing.
 */
export interface RealtimeSettings {
  enabled?: boolean;
  /** Reverb speaks the Pusher protocol, so pusher-js covers both. */
  broadcast_driver?: Nullable<string>;
  key?: Nullable<string>;
  cluster?: Nullable<string>;
  /** Empty means Pusher cloud, reached by `cluster`. */
  host?: Nullable<string>;
  port?: Nullable<Numeric>;
  /** `http` / `ws` means plain ws; anything else (including empty) means wss. */
  scheme?: Nullable<string>;
  customer_auth_endpoint?: Nullable<string>;
  delivery_boy_auth_endpoint?: Nullable<string>;
}

export interface DeepLinkSettings {
  /** `"0"` turns "Open in app" off even when a scheme is set. */
  deeplink_enabled?: Flag;
  /** Lower-case, no `://`. Empty turns the feature off (DEEPLINK_SPEC.md §1). */
  deeplink_scheme?: Nullable<string>;
}
export interface AppSettings {
  app_name?: string;
  favicon?: Url;
  /** Currency symbol, prefixed to every price. */
  currency?: string;
  /** Fraction digits; passed straight to `toFixed()`. */
  decimal_point?: Numeric;
  /** Max distinct cart lines; compared with `>=` against the cart length. */
  max_cart_items_count?: Numeric;
  /**
   * Admin → Demo Mode. Arrives as a NUMBER while every flag beside it is a
   * string (trap 12) — read it through `isDemoModeOn`, never `=== "1"`.
   */
  is_demo_mode_on?: Flag;
  /** How many days ahead the delivery date picker allows (`parseInt`, default 15). */
  time_slots_allowed_days?: Numeric;
  /**
   * The panel's own date and time formats, in PHP `date()` letters
   * (`"d-m-Y"`, `"h:i A"`). API dates arrive already formatted this way and in
   * the shop's timezone, so anything that computes with them parses with these
   * first — see `parseApiDate` (WEB_PARITY_V4.0.2 §9).
   */
  date_format?: Nullable<string>;
  time_format?: Nullable<string>;
  /**
   * Admin → Store Settings → Map Provider (§4). `"osm"` means OpenStreetMap;
   * anything else, including absent, means Google.
   */
  map_provider?: Nullable<string>;
  /** `{z}/{x}/{y}` template. Not sent yet — `OSM_DEFAULT_TILE_URL` stands in. */
  map_tile_url?: Nullable<string>;
  /** Credit text, which must itself credit OSM. Not sent yet. */
  map_tile_attribution?: Nullable<string>;
  /** Nominatim-compatible base URL for OSM geocoding. Not sent yet — `OSM_DEFAULT_GEOCODER_URL` stands in. */
  map_geocoder_url?: Nullable<string>;
  default_city?: Nullable<DefaultCity>;
  /** Ids of the signed-in user's wishlisted products (seeds the Favorite slice). */
  favorite_product_ids?: Id[];

  // Contact / footer
  support_email?: string;
  support_number?: string;
  store_address?: string;
  appstore_url?: Url;
  playstore_url?: Url;
  social_media?: SocialMediaLink[];
  web_settings?: WebSettings;
  /** App-link config; absent until the admin panel ships the block. */
  deeplink_settings?: DeepLinkSettings;

  // Login options — all compared with `== 1`
  phone_login?: Flag;
  email_login?: Flag;
  google_login?: Flag;
  /** OTP via Firebase phone auth. */
  firebase_authentication?: Flag;
  /** OTP via the backend's own SMS gateway. */
  custom_sms_gateway_otp_based?: Flag;
  /** Phone accounts sign in with a password instead of OTP. */
  phone_auth_password?: Flag;
  /** Default country for the phone input, ISO alpha-2 (lower-cased before use). */
  nation_code?: string;
  /** Default dial code for the phone input. */
  country_code?: string;

  // Home offer popup — flags compared with `=== "1"` / `=== "0"`
  popup_enabled?: Flag;
  popup_always_show_home?: Flag;
  popup_type?: PopupType;
  /** Category id when `popup_type` is `"category"`. */
  popup_type_id?: Id;
  popup_slug?: string;
  popup_url?: Url;
  popup_image?: Url;

  // Policy pages (HTML)
  about_us?: string;
  contact_us?: string;
  privacy_policy?: string;
  terms_conditions?: string;
  cancellation_policy?: string;
  returns_and_exchanges_policy?: string;
  shipping_policy?: string;
}

/** Keys of the per-gateway on/off flags in `payment_setting` (each `"1"` or `"0"`). */
export type PaymentMethodFlagKey =
  | "razorpay_payment_method"
  | "paypal_payment_method"
  | "paystack_payment_method"
  | "stripe_payment_method"
  | "cashfree_payment_method"
  | "midtrans_payment_method"
  | "phonepay_payment_method"
  | "paytabs_payment_method"
  | "dpo_payment_method";

/** Gateway flags; read as `payment_setting[key] === "1"`. */
export type PaymentMethodFlags = Partial<Record<PaymentMethodFlagKey, Flag>>;

export interface PaymentSettings extends PaymentMethodFlags {
  /**
   * Cash on delivery's own flag (WEB_PARITY_V4.0.2 §1.7). Absent on older
   * payloads, where the charges response is the only gate — see `isCodAllowed`.
   */
  cod_payment_method?: Flag;
  razorpay_key?: string;
  stripe_publishable_key?: string;
  paystack_public_key?: string;
  paystack_currency_code?: string;
}

export interface SeoTranslations {
  meta_title?: string;
  meta_description?: string;
  meta_keyword?: string;
  og_image_url?: Url;
  favicon?: Url;
  /** Markup string; parsed with `extractJSONFromMarkup`. */
  schema_markup?: string;
}

/**
 * Item of `settings/get_seo_settings?page_type=…` `data` (read in pages'
 * getServerSideProps). Some pages read `og_image_url` / `favicon` at the top
 * level, others under `translations`, so both are declared.
 */
export interface SeoSettings {
  og_image_url?: Url;
  favicon?: Url;
  translations?: SeoTranslations;
}
