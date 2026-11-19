// Shape of the Redux store (src/redux/rootReducer.js), one interface per slice.
//
// These describe the state AS IT IS TODAY — including loose or mixed shapes —
// because the persisted `persist:root` data of existing users must keep
// working unchanged. Where a field can hold several shapes, the union lists
// them; see MIGRATION_PLAN.md §2.5 / §9 for why.
//
// Rehydration note: redux-persist stores JSON, so every `Date` put in state
// comes back as a string after a reload — those fields are `Date | string`.
//
// Phase 4: the slices will use these interfaces for their `initialState`, and
// RootState can then be derived from the store instead of written by hand.
import type { PersistState } from "redux-persist";
import type { DateString, Id, Nullable, Numeric } from "./common";
import type { Address } from "./models/address";
import type { AppliedPromoCode, CartData, CartLine, GuestCartLine, StoredCart } from "./models/cart";
import type { Category, ShopData } from "./models/catalog";
import type { OrderType, PaymentMethod, PhonePeInitData, PrescriptionGroup } from "./models/checkout";
import type { City } from "./models/city";
import type { Language, LanguageListItem } from "./models/language";
import type { Module } from "./models/module";
import type { Product } from "./models/product";
import type { AppSettings, PaymentSettings, RealtimeSettings } from "./models/settings";
import type { ThemePayload } from "./models/theme";
import type { TimeSlot } from "./models/misc";
import type { AuthType, User } from "./models/user";

/** Most slices flip this to "fulfill" on their first write and never back. */
export type SliceStatus = "loading" | "fulfill";

/** Payload convention used by almost every action: `dispatch(action({ data }))`. */
export interface DataPayload<T> {
  data: T;
}

// ── Cart ──────────────────────────────────────────────────────────────────────
export interface CartState {
  status: SliceStatus;
  /** Written by setCart with several shapes; only used as an effect dependency. */
  cart: StoredCart;
  /** getCart({ is_checkout: 1 }).data */
  checkout: Nullable<CartData>;
  promo_code: Nullable<AppliedPromoCode>;
  cartProducts: CartLine[];
  /** API `sub_total` (number or numeric string) or a client-computed total; can be undefined. */
  cartSubTotal: Numeric | undefined;
  guestCart: GuestCartLine[];
  isGuest: boolean;
  /** Adjusted with add/subGuestCartTotal (numbers, never below 0). Can still be a string in state persisted before fix #30. */
  guestCartTotal: Numeric;
  self_pickup_mode: Numeric | undefined;
  doorstep_delivery_mode: Numeric | undefined;
}

// ── UI ────────────────────────────────────────────────────────────────────────
/** Transient UI flags. Excluded from redux-persist (see store.ts). */
export interface UiState {
  /** Cart + checkout live in the drawer; `/cart` and `/checkout` open it. */
  cartDrawerOpen: boolean;
  /** Home opens the location picker when it has no coordinates (§8). */
  locationModalOpen: boolean;
  /** Mobile "Open in app" banner is on screen; the location picker waits for it. */
  appBannerOpen: boolean;
  /**
   * The module whose content is actually on screen, when a page owns that
   * (Home, while a module switch loads). The theme follows it, so colours and
   * content change together; null means "follow the active module".
   */
  displayedModuleId: Nullable<Id>;
}

// ── Checkout ──────────────────────────────────────────────────────────────────
export interface CheckoutState {
  currentStep: number;
  address: Nullable<Address>;
  /** ISO string from the date picker, or the en-US estimate string (time slots off). */
  selectedDate: Nullable<string>;
  timeSlot: Nullable<TimeSlot>;
  selectedPaymentMethod: Nullable<PaymentMethod>;
  isWalletChecked: boolean;
  usedWalletBalance: number;
  /** Can become undefined via setOrderNote("") (bug #2). */
  orderNote: string | undefined;
  checkoutTotal: number;
  /** "" until a PhonePe transaction is initiated (stored raw, not under `data`). */
  phonepecheckoutdetails: "" | PhonePeInitData;
  orderType: OrderType;
  /** Legacy flat list; always persisted as []. */
  prescriptions: { file: File | Blob; preview: string }[];
  prescriptionGroups: PrescriptionGroup[];
  /** product_variant_ids selected for the next prescription group. */
  selectedPrescriptionProductIds: Id[];
  prescriptionGroupSeq: number;
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface UserState {
  status: SliceStatus;
  user: Nullable<User>;
  /** Device push token: "" until fetched on page load; kept on logout. Can be null in state persisted before fix #32. */
  fcm_token: Nullable<string>;
  /** Firebase uid or the backend user id. */
  authId: Id;
  jwtToken: string;
  /** Reset to "" by logoutAuth (fix #10). */
  authType: AuthType | string;
}

// ── ProductFilter ─────────────────────────────────────────────────────────────
export interface ProductFilterState {
  search: Nullable<string>;
  section_id: Nullable<Id>;
  brand_ids: Id[];
  /** null, "", a number, a comma-joined id list, a slug, or a sentinel ("NaN", "all categories"). */
  category_id: Nullable<Id>;
  grid_view: boolean;
  /** Apply without a chosen range dispatches { min_price: null, max_price: null }. */
  price_filter: Nullable<{ min_price: Numeric | null; max_price: Numeric | null }>;
  sort_filter: string;
  /** Read but never written — always []. */
  search_sizes: { size: string; unit_id: Id; checked: boolean }[];
  /** "" when unset. */
  seller_id: Id;
  /** "" when unset. */
  country_id: Id;
  search_product: Product[];
  /** Appended to, never replaced. */
  selectedCategories: unknown[];
  searchedCategory: Id;
  listing_source: "all" | "category" | string;
  category_slug: string;
  categoryBreadcrumb: CategoryCrumb[];
}

/** One step of the category breadcrumb (category flow). */
export type CategoryCrumb = Pick<Category, "id" | "slug"> & Partial<Pick<Category, "name" | "translations">>;

// ── Setting ───────────────────────────────────────────────────────────────────
export interface SettingState {
  status: SliceStatus;
  setting: Nullable<AppSettings>;
  payment_setting: Nullable<PaymentSettings>;
  /** Sibling of `data` in the settings response, not part of it (§3.1). */
  realtime: Nullable<RealtimeSettings>;
  /** ISO string (new Date().toISOString()). Never read. */
  settingsFetchedTime: DateString;
  /** ISO string (new Date().toISOString()). Never read. */
  paymentSettingsFetchTime: DateString;
  isPopupSeen: boolean;
}

// ── Favorite ──────────────────────────────────────────────────────────────────
export interface FavoriteState {
  status: SliceStatus;
  /** Seeded from settings.favorite_product_ids, which is undefined for guests. */
  favouriteProductIds: Id[] | undefined;
}

// ── City ──────────────────────────────────────────────────────────────────────
export interface CityState {
  status: SliceStatus;
  city: Nullable<City>;
}

// ── Addresses ─────────────────────────────────────────────────────────────────
export interface AddressState {
  /** Initial [] then an Address or null. */
  selectedEditAddress: Address | null | never[];
  allAddresses: Address[];
  /** Never written — always []. */
  selectedAddress: Address | never[];
}

// ── Shop ──────────────────────────────────────────────────────────────────────
export interface ShopState {
  status: SliceStatus;
  /** Can be undefined when Location.jsx stores an unguarded response. */
  shop: ShopData | null | undefined;
  /** Incremented to force the home query to refetch (part of its query key). */
  isRefetch: number;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
export interface ThemeState {
  status: SliceStatus;
  theme: "light" | "dark" | string;
  moduleThemes: Nullable<ThemePayload>;
}

// ── Language ──────────────────────────────────────────────────────────────────
export interface LanguageState {
  /** Can be undefined after Header's language switch (bug #1) until Layout corrects it. */
  selectedLanguage: Language | null | undefined;
  availableLanguages: Nullable<LanguageListItem[]>;
}

// ── Module ────────────────────────────────────────────────────────────────────
export interface ModuleState {
  modules: Module[];
  /** Number or string depending on where it was set; compared via String(). */
  activeModuleId: Nullable<Id>;
}

// ── Root ──────────────────────────────────────────────────────────────────────
/** Keys and order match combineReducers in src/redux/rootReducer.js. */
export interface RootState {
  Cart: CartState;
  City: CityState;
  Shop: ShopState;
  Setting: SettingState;
  User: UserState;
  ProductFilter: ProductFilterState;
  Theme: ThemeState;
  Addresses: AddressState;
  Favorite: FavoriteState;
  Checkout: CheckoutState;
  Language: LanguageState;
  Module: ModuleState;
  Ui: UiState;
  _persist: PersistState;
}
