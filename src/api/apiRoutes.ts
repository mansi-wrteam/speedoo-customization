"use client";
import axios from "axios";
import type { AxiosResponse } from "axios";
import api from "./axiosMiddleware";
import * as apiEndPoints from "./apiEndpoints";
import { getActiveStore } from "@/redux/storeAccess";
import type {
  ApiResponse,
  Base64JsonResponse,
  SettingsResponse,
  LatLng,
  PageParams,
  ProductListResponse,
} from "@/types/api";
import type { Flag, Id, Nullable, Numeric } from "@/types/common";
import type {
  AddToCartResponse,
  Address,
  AppliedPromoCode,
  Blog,
  BlogCategory,
  BlogTag,
  Brand,
  BrandBackgroundSettings,
  CartData,
  Category,
  CategoryBackgroundSettings,
  City,
  Country,
  CountryBackgroundSettings,
  CouponHistoryEntry,
  CouponRedeemData,
  CreditDashboardData,
  CreditLedgerEntry,
  CreditOrderDetailData,
  CreditPayment,
  CreditPayWalletData,
  CreditPlansData,
  CreditQuoteData,
  CreditStatusData,
  CustomField,
  Faq,
  InitiateTransactionData,
  Installment,
  InstallmentStatus,
  Language,
  LanguageListItem,
  LiveTracking,
  LiveTrackingRoute,
  LoginResponseData,
  MailSettings,
  Module,
  Notification,
  Order,
  OrderType,
  PhonePeOrderStatusData,
  PlaceOrderResponseData,
  Product,
  ProductRatingImages,
  ProductRatingSummary,
  ProductReview,
  PromoCode,
  RemoveFromCartResponse,
  RequestedProduct,
  Seller,
  ShopData,
  SubscriptionPlan,
  ThemePayload,
  TimeSlotsResponse,
  Transaction,
  User,
  UserActivePlan,
  WalletTransaction,
} from "@/types/models";

/**
 * `FormData` as the browser really treats it: `append` converts every non-Blob
 * value to a string (`1` → "1", `true` → "true", `null` → "null",
 * `undefined` → "undefined"). These routes append ids, numbers, flags and
 * possibly-missing values and rely on that conversion, so the DOM signature
 * (string | Blob only) is widened once here instead of casting every call.
 * Type-only: the object is still a plain `new FormData()`.
 */
interface LooseFormData extends FormData {
  append(
    name: string,
    value: string | Blob | number | boolean | null | undefined,
    fileName?: string,
  ): void;
}

/** Values of the tenant custom fields, keyed by field id (see useCustomFields). */
export type CustomFieldValues = Record<
  string,
  string | string[] | File | null | undefined
>;

/** Payment flow a transaction belongs to. */
export type TransactionType = "order" | "wallet" | "subscription";

// Returns the X-Module-Id header from the active module (or {} if none)
const moduleHeader = () => {
  const id = getActiveStore().getState()?.Module?.activeModuleId;
  return id ? { "X-Module-Id": id } : {};
};

// Authentication API's
export interface GetCustomFieldsParams {
  /** Record type the fields belong to. */
  module?: string;
  active_only?: number;
}

export const getCustomFields = async ({
  module = "customer",
  active_only = 1,
}: GetCustomFieldsParams = {}): Promise<ApiResponse<CustomField[]>> => {
  // This endpoint lives under /api, not the /customer sub-url the axios
  // instance is based at, so pass an absolute URL (baseURL is then ignored).
  const response = await api.get<ApiResponse<CustomField[]>>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/${apiEndPoints.customFields}`,
    {
      params: { module, active_only },
      headers: moduleHeader(),
    },
  );
  return response.data;
};

export interface RegisterUserParams {
  /** Passed by Register.jsx but not read. */
  id?: string;
  name?: Nullable<string>;
  email?: Nullable<string>;
  mobile?: Nullable<string>;
  /** "email" | "phone" | "google". */
  type?: string;
  fcm?: Nullable<string>;
  country_code?: string;
  password?: string;
  phoneAuthType?: boolean;
  /** `null` skips the field; `undefined` is sent as the string "undefined". */
  friend_code?: Nullable<string>;
  profile?: Nullable<File>;
  customFields?: Nullable<CustomFieldValues>;
}

export const registerUser = async ({
  name,
  email,
  mobile,
  type,
  fcm,
  country_code,
  password,
  phoneAuthType = false,
  friend_code,
  profile,
  customFields,

}: RegisterUserParams): Promise<ApiResponse<LoginResponseData>> => {
  const formData: LooseFormData = new FormData();
  formData.append("name", name);
  formData.append("country_code", country_code);
  formData.append("type", type);
  formData.append("fcm_token", fcm);
  formData.append("platform", "web");
  if (type == "email" || (type == "phone" && phoneAuthType == true)) {
    formData.append("password", password);
  }
  if(profile){
    formData.append("profile", profile);
  }
  if (
    type === "phone" ||
    ((type === "email" || type === "google") && mobile !== null && mobile !== "")
  ) {
    formData.append("mobile", mobile);
  }
  if (type === "email" || type === "google" || (type === "phone" && email)) {
    formData.append("email", email);
  }
  // Only a real code: undefined/null/"" used to be sent (undefined as "undefined").
  if (friend_code != null && friend_code !== "") {
    formData.append("friends_code", friend_code);
  }
  // Dynamic per-tenant fields from custom_fields/list, keyed by field id.
  if (customFields) {
    Object.entries(customFields).forEach(([fieldId, value]) => {
      if (value === undefined || value === null || value === "") return;
      formData.append(
        `custom_fields[${fieldId}]`,
        Array.isArray(value) ? value.join(",") : value,
      );
    });
  }
  const response = await api.post<ApiResponse<LoginResponseData>>(apiEndPoints.register, formData);
  return response.data;
};

export interface LoginParams {
  /** Phone number (phone login) or email address. */
  id: string;
  fcm?: Nullable<string>;
  /** "email" | "phone" | "google". */
  type: string;
  password?: string;
  phoneAuthType?: boolean;
  country_code?: string;
}

export const login = async ({
  id,
  fcm,
  type,
  password,
  phoneAuthType,
  country_code,
}: LoginParams): Promise<ApiResponse<LoginResponseData>> => {
  const formData: LooseFormData = new FormData();
  formData.append("id", id);
  formData.append("fcm_token", fcm);
  formData.append("type", type);
  formData.append("platform", "web");
  if (country_code) {
    formData.append("country_code", country_code);
  }
  if (type == "phone") {
    if (phoneAuthType == true) {
      formData.append("phone_auth_type", "phone_auth_password");
    } else {
      formData.append("phone_auth_type", "phone_auth_otp");
    }
  }
  if (type == "email" || (type == "phone" && phoneAuthType == true)) {
    formData.append("password", password);
  }
  const response = await api.post<ApiResponse<LoginResponseData>>(apiEndPoints.login, formData);
  return response.data;
};

export interface SendSmsParams {
  mobile: string;
}

export const sendSms = async ({ mobile }: SendSmsParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("phone", mobile);
  const response = await api.post<ApiResponse<unknown>>(apiEndPoints.sendSms, formData);
  return response.data;
};

export interface VerifyOtpParams {
  mobile: string;
  otp: string;
  /** With the leading "+", e.g. "+91". */
  country_code: string;
}

export const verifyOTP = async ({ mobile, otp, country_code }: VerifyOtpParams): Promise<ApiResponse<LoginResponseData>> => {
  const formData: LooseFormData = new FormData();
  formData.append("phone", mobile);
  formData.append("otp", otp);
  formData.append("country_code", country_code);
  const response = await api.post<ApiResponse<LoginResponseData>>(apiEndPoints.verifyContact, formData);
  return response.data;
};

export interface VerifyEmailParams {
  email: string;
  code: string;
}

export const verifyEmail = async ({ email, code }: VerifyEmailParams): Promise<ApiResponse<LoginResponseData>> => {
  const params = {
    email: email,
    code: code,
  };
  const response = await api.post<ApiResponse<LoginResponseData>>(apiEndPoints.verifyEmail, params);
  return response.data;
};

export interface ForgotPasswordOtpParams {
  email: string;
}

export const forgotPasswordOTP = async ({ email }: ForgotPasswordOtpParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("email", email);
  const response = await api.post<ApiResponse<unknown>>(apiEndPoints.forgotPasswordOtp, formData);
  return response.data;
};

export interface ForgotPasswordParams {
  /** Phone flow only. */
  phone?: string;
  otp?: Nullable<string>;
  /** Email flow only. */
  email?: string;
  password: string;
  confirmPassword: string;
  /** "email" | "phone". */
  type: string;
  /** Phone flow: "firebase" | "twilio". */
  otpMethod?: string;
  country_code?: string;
}

export const forgotPassword = async ({
  phone,
  otp,
  email,
  password,
  confirmPassword,
  type,
  otpMethod,
  country_code,
}: ForgotPasswordParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  if (type == "email" || (type == "phone" && otpMethod == "twilio")) {
    formData.append("otp", otp);
  }
  if (type == "email") {
    formData.append("email", email);
  }
  if (type == "phone") {
    formData.append("mobile", phone);
    if (country_code) {
      formData.append("country_code", country_code);
    }
  }
  formData.append("password", password);
  formData.append("password_confirmation", confirmPassword);
  formData.append("type", type);
  if (type == "phone") {
    formData.append("otp_verify_method", otpMethod);
  }
  const response = await api.post<ApiResponse<unknown>>(apiEndPoints.forgotPassword, formData);
  return response.data;
};

export interface ResetPasswordParams {
  /** Current password. */
  password: string;
  newPassword: string;
  confirmPassword: string;
}

export const resetPassword = async ({
  password,
  newPassword,
  confirmPassword,
}: ResetPasswordParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("old_password", password);
  formData.append("new_password", newPassword);
  formData.append("new_password_confirmation", confirmPassword);
  const response = await api.post<ApiResponse<unknown>>(apiEndPoints.resetPassword, formData);
  return response.data;
};

export interface UpdateProfileParams {
  /** New avatar; `null` when unchanged (sent as the string "null"). */
  image?: Nullable<File>;
  name: string;
  email: string;
  /** Omitted when unchanged, so the server's unique check doesn't run on it. */
  mobileNumber?: string;
  /** Passed by Profile.jsx but not read. */
  type?: string;
  country_code?: string;
  customFields?: Nullable<CustomFieldValues>;
}

export const updateProfile = async ({
  image,
  name,
  email,
  mobileNumber,
  type,
  country_code,
  customFields,
}: UpdateProfileParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("profile", image);
  formData.append("name", name);
  formData.append("email", email);
  if (mobileNumber) {
    formData.append("mobile", mobileNumber);
    if (country_code) {
      formData.append("country_code", country_code);
    }
  }
  // Same per-tenant custom_fields[id] shape registerUser() sends — the
  // fields are defined once (custom_fields/list) and apply to both create
  // and edit of a customer record.
  if (customFields) {
    Object.entries(customFields).forEach(([fieldId, value]) => {
      if (value === undefined || value === null || value === "") return;
      formData.append(
        `custom_fields[${fieldId}]`,
        Array.isArray(value) ? value.join(",") : value,
      );
    });
  }
  const response = await api.post<ApiResponse<unknown>>(apiEndPoints.editProfile, formData);
  return response.data;
};

/** `user_details` answers the customer under `user`, not `data`. */
export interface UserDetailsResponse extends ApiResponse<unknown> {
  user: User;
}

export const getUser = async (): Promise<UserDetailsResponse> => {
  const response = await api.get<UserDetailsResponse>(apiEndPoints.getUser);
  return response.data;
};
export const logout = async (): Promise<ApiResponse<unknown>> => {
  const response = await api.post<ApiResponse<unknown>>(`${apiEndPoints.logout}`);
  return response.data;
};
export interface DeleteUserParams {
  /** Built into FormData that is never sent. */
  uid?: Nullable<Id>;
}

export const deleteUser = async ({ uid = null }: DeleteUserParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("auth_uid", uid);
  const response = await api.post<ApiResponse<unknown>>(apiEndPoints.deleteAccount, formData);
  return response.data;
};

// Location api's
/** One Google Places (New) autocomplete suggestion, proxied by `google_places_autocomplete`. */
export interface PlaceSuggestion {
  placePrediction: {
    placeId: string;
    structuredFormat: {
      mainText: { text: string };
      secondaryText: { text: string };
    };
  };
}

/** `data` of `getPlaces()`. */
export interface PlacesAutocompleteData {
  suggestions?: PlaceSuggestion[];
}

/** `data` of `getPlacesDetails()` (Google Places (New) place details). */
export interface PlaceDetailsData {
  location: { latitude: number; longitude: number };
  formattedAddress?: string;
  addressComponents?: { longText?: string }[];
}

export interface GetPlacesParams {
  input: string;
}

export const getPlaces = async ({ input }: GetPlacesParams): Promise<ApiResponse<PlacesAutocompleteData>> => {
  const params = { input: input, source: "web" };

  const response = await api.get<ApiResponse<PlacesAutocompleteData>>(apiEndPoints.getPlaces, { params });
  return response.data;
};

export interface GetPlacesDetailsParams {
  placeId: string;
}

export const getPlacesDetails = async ({ placeId }: GetPlacesDetailsParams): Promise<ApiResponse<PlaceDetailsData>> => {
  const params = { place_id: placeId, source: "web" };
  const response = await api.get<ApiResponse<PlaceDetailsData>>(apiEndPoints.getPlacecDetails, { params });
  return response.data;
};

// General Api's
export const getCity = async ({ latitude, longitude }: LatLng): Promise<ApiResponse<City>> => {
  let params = { latitude: latitude, longitude: longitude };
  const response = await api.get<ApiResponse<City>>(apiEndPoints.getCity, { params });
  return response.data;
};

export interface GetShopParams extends LatLng {
  /** Falls back to the active module in the store when omitted. */
  module_id?: Nullable<Id>;
}

export const getShop = async ({ latitude, longitude, module_id }: GetShopParams): Promise<ApiResponse<ShopData>> => {
  let params = { latitude: latitude, longitude: longitude };
  // Use the passed module_id if given, else fall back to the active module from
  // the store — so callers that don't pass it (e.g. the header location change)
  // still send X-Module-Id.
  const headers = module_id ? { "X-Module-Id": module_id } : moduleHeader();
  // ~775 KB and up to ~11s under load: without a cap a stalled request on a weak
  // connection never settles, and Home never gets to show its retry state.
  const response = await api.get<ApiResponse<ShopData>>(apiEndPoints.getShop, {
    params,
    headers,
    timeout: 30000,
  });
  return response.data;
};

export interface GetCategoriesParams extends PageParams {
  slug?: string;
  id?: Id;
  is_own_data?: number;
}

/** `categories` also carries the list-level card colours next to `data`. */
export type CategoriesResponse = ApiResponse<Category[]> & CategoryBackgroundSettings;

export const getCategories = async ({
  slug = "",
  id = "",
  limit,
  offset,
  is_own_data,
}: GetCategoriesParams = {}): Promise<CategoriesResponse> => {
  const params = {
    limit,
    offset,
    ...(slug && { slug }),
    ...(id && { id }),
    ...(is_own_data && { is_own_data }),
  };

  const response = await api.get<CategoriesResponse>(apiEndPoints.getCategory, {
    params,
    headers: moduleHeader(),
  });
  return response.data;
};

export const getModules = async (): Promise<ApiResponse<Module[]>> => {
  const response = await api.get<ApiResponse<Module[]>>(apiEndPoints.modules);
  return response.data;
};

/**
 * Listing filters, appended to FormData as-is (FormData stringifies them).
 * Keys seen at call sites: search, category_id, category_ids, category_slug,
 * brand_ids, seller_id, country_id, section_id, min_price, max_price, sort,
 * sizes, unit_ids, limit, offset.
 */
export type ProductFilters = Record<
  string,
  string | number | boolean | null | undefined | unknown[]
>;

export interface GetProductByFilterParams extends LatLng {
  filters?: ProductFilters;
  tag_names?: Nullable<string>;
  slug?: string;
  /** Overrides the active module — for prefetching a module not yet switched to. */
  module_id?: Id;
}

export const getProductByFilter = async ({
  latitude,
  longitude,
  filters = undefined,
  tag_names = "",
  slug = "",
  module_id,
}: GetProductByFilterParams): Promise<ProductListResponse<Product>> => {
  const formData: LooseFormData = new FormData();
  formData.append("latitude", latitude);
  formData.append("longitude", longitude);
  if (tag_names !== "") {
    formData.append("tag_names", tag_names);
  }
  if (slug !== "") {
    formData.append("tag_slug", slug);
  }
  if (filters !== undefined) {
    for (const filter in filters) {
      const value = filters[filter];
      // Skip unset values and empty arrays (FormData would send [] as "").
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      if (value !== null && value !== undefined && value !== "" && !isEmptyArray) {
        // Arrays are stringified by FormData ("a,b").
        formData.append(filter, value as string);
      }
    }
  }
  const response = await api.post<ProductListResponse<Product>>(apiEndPoints.getProducts, formData, {
    headers: module_id ? { "X-Module-Id": module_id } : moduleHeader(),
  });
  return response.data;
};

export interface GetBrandsParams extends PageParams, LatLng {}

/** `brands` also carries the list-level card colours next to `data`. */
export type BrandsResponse = ApiResponse<Brand[]> & BrandBackgroundSettings;

export const getBrands = async ({ limit, offset, latitude, longitude }: GetBrandsParams): Promise<BrandsResponse> => {
  let params = {
    limit: limit,
    offset: offset,
    latitude: latitude,
    longitude: longitude,
  };
  const response = await api.get<BrandsResponse>(apiEndPoints.getBrands, {
    params,
    headers: moduleHeader(),
  });
  return response.data;
};

// The theme endpoint lives under /api, not the /customer base URL the shared
// axios instance is configured with, so it is requested directly.
export const getTheme = async (): Promise<ApiResponse<ThemePayload>> => {
  const response = await axios.get<ApiResponse<ThemePayload>>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/${apiEndPoints.getTheme}`,
  );
  return response.data;
};

export const getSetting = async (): Promise<SettingsResponse> => {
  const params = {
    is_web_setting: 1,
  };
  const response = await api.get<SettingsResponse>(apiEndPoints.getSettings, { params });
  return response.data;
};

export interface GetProductByIdParams extends LatLng {
  slug?: string;
  /** `-1` = look up by slug only. */
  id?: Id;
}

export const getProductById = async ({ latitude, longitude, slug, id }: GetProductByIdParams): Promise<ApiResponse<Product>> => {
  const formData: LooseFormData = new FormData();
  formData.append("latitude", latitude);
  formData.append("longitude", longitude);
  if (id !== -1) {
    formData.append("id", id);
  }
  if (slug) {
    formData.append("slug", slug);
  }
  const response = await api.post<ApiResponse<Product>>(apiEndPoints.getProductById, formData, {
    headers: moduleHeader(),
  });
  return response.data;
};

export interface ProductPageParams {
  /** Product id. */
  id?: Id;
  limit?: number;
  offset?: number;
}

export const getProductRatings = async ({ id, limit, offset }: ProductPageParams): Promise<ApiResponse<ProductRatingSummary>> => {
  const params = {
    product_id: id,
    limit: limit,
    offset: offset,
  };
  const response = await api.get<ApiResponse<ProductRatingSummary>>(
    `${apiEndPoints.getProducts}/${apiEndPoints.getProductRatings}`,
    { params, headers: moduleHeader() }
  );

  return response.data;
};

export const getProductImages = async ({ id, limit, offset }: ProductPageParams): Promise<ApiResponse<ProductRatingImages>> => {
  const formData: LooseFormData = new FormData();
  formData.append("product_id", id);
  formData.append("limit", limit);
  formData.append("offset", offset);
  const response = await api.post<ApiResponse<ProductRatingImages>>(
    `${apiEndPoints.getProducts}/${apiEndPoints.rating}/${apiEndPoints.imageList}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

export const getPaymentSetting = async (): Promise<Base64JsonResponse> => {
  const response = await api.get<Base64JsonResponse>(
    `${apiEndPoints.getSettings}/${apiEndPoints.getPaymentMethods}`
  );
  return response.data;
};

export interface GetSystemLanguagesParams {
  /** `0` = list every language; a language id = that language with its strings. */
  id?: Id;
  isDefault?: number;
  /** `3` = website. */
  systemType?: number;
}

/** A list when called with `id: 0`, a single language otherwise. */
export type SystemLanguagesData = Language | LanguageListItem[];

export const getSystemLanguages = async ({ id, isDefault, systemType }: GetSystemLanguagesParams): Promise<ApiResponse<SystemLanguagesData>> => {
  const params = { id: id, is_default: isDefault, system_type: systemType };
  const response = await api.get<ApiResponse<SystemLanguagesData>>(apiEndPoints.getSystemLanguage, { params });
  return response.data;
};

export interface UpdateFcmTokenParams {
  /** Language id (`Language.admin_lang_id_for_fcm`); the misspelling is part of the contract. */
  langaugeId?: Id;
  fcmToken?: Nullable<string>;
}

export const updateFcmToken = async ({ langaugeId,fcmToken }: UpdateFcmTokenParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("language_id", langaugeId);
  formData.append("fcm_token", fcmToken);
  const response = await api.post<ApiResponse<unknown>>(apiEndPoints.updateFcmToken, formData);
  return response.data;
};

// cart apis
export interface GetCartParams extends LatLng {
  /** `1` adds the checkout totals. */
  checkout?: number;
  promocode_id?: Id;
  order_type?: OrderType;
  is_free_delivery?: Flag;
}

export const getCart = async ({
  latitude,
  longitude,
  checkout = 0,
  promocode_id = 0,
  order_type = "doorstep",
  is_free_delivery = 0,
}: GetCartParams): Promise<ApiResponse<CartData>> => {
  const params: Record<string, unknown> = {
    latitude: latitude,
    longitude: longitude,
    is_checkout: checkout,
    is_self_pickup: order_type == "doorstep" ? 0 : 1,
    is_free_delivery,
  };
  if (promocode_id !== 0) {
    params.promocode_id = promocode_id;
  }
  const response = await api.get<ApiResponse<CartData>>(apiEndPoints.getCart, {
    params,
    headers: moduleHeader(),
  });
  return response.data;
};

export interface AddToBulkCartParams {
  /** Comma-separated variant ids. */
  variant_ids?: string;
  /** Comma-separated quantities, same order as `variant_ids`. */
  quantities?: string;
}

/** `bulk_add_to_cart_items` returns the new cart subtotal at the top level. */
export type AddToBulkCartResponse = ApiResponse<unknown> & Pick<AddToCartResponse, "sub_total">;

export const addToBulkCart = async ({ variant_ids, quantities }: AddToBulkCartParams): Promise<AddToBulkCartResponse> => {
  const params = { variant_ids: variant_ids, quantities: quantities };
  const response = await api.post<AddToBulkCartResponse>(
    `${apiEndPoints.getCart}/${apiEndPoints.bulkAddToCart}`,
    null,
    { params: params, headers: moduleHeader() }
  );
  return response.data;
};

export interface AddToCartParams {
  /** Required by the API; optional here because callers pass `product?.id`. */
  product_id?: Id;
  product_variant_id?: Id;
  /** Target quantity, not a delta. */
  qty?: number;
  /** Omit on a quantity edit (an empty array blanks the row's add-ons). */
  selected_addon_ids?: Id[];
  cart_id?: Nullable<Id>;
}

// `qty` is the TARGET quantity, not a delta.
//
// `cart_id` addresses one specific row: add-ons make (product_id,
// product_variant_id) non-unique, so quantity edits and removals must name the
// row. Omit it on a first add and the server matches on product + variant + the
// exact add-on set, incrementing an existing row or inserting a new one.
//
// `selected_addon_ids` must be OMITTED (not sent empty) on a quantity edit —
// the server keeps the row's add-ons when the field is absent, but an empty
// array blanks them.
export const addToCart = async ({
  product_id,
  product_variant_id,
  qty,
  selected_addon_ids,
  cart_id,
}: AddToCartParams): Promise<AddToCartResponse> => {
  const formData: LooseFormData = new FormData();
  formData.append("product_id", product_id);
  formData.append("product_variant_id", product_variant_id);
  formData.append("qty", qty);
  if (cart_id != null) {
    formData.append("cart_id", cart_id);
  }
  // Indexed keys — the endpoint does not accept a bare `selected_addon_ids[]`.
  selected_addon_ids?.forEach((id, index) =>
    formData.append(`selected_addon_ids[${index}]`, id)
  );
  const response = await api.post<AddToCartResponse>(
    `${apiEndPoints.getCart}/${apiEndPoints.add}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

export interface RemoveFromCartParams {
  /** Required by the API; optional here because callers pass `product?.id`. */
  product_id?: Id;
  product_variant_id?: Id;
  /** Ignored: `is_remove_all` is always sent as 0. */
  isRemoveAll?: boolean;
  cart_id?: Nullable<Id>;
}

// Pass `cart_id` to drop one specific row; without it the server deletes every
// add-on combination of that product.
export const removeFromCart = async ({
  product_id,
  product_variant_id,
  isRemoveAll,
  cart_id,
}: RemoveFromCartParams): Promise<RemoveFromCartResponse> => {
  const formData: LooseFormData = new FormData();
  formData.append("product_id", product_id);
  formData.append("product_variant_id", product_variant_id);
  formData.append("is_remove_all", 0);
  if (cart_id != null) {
    formData.append("cart_id", cart_id);
    formData.append("qty", 0);
  }
  const response = await api.post<RemoveFromCartResponse>(
    `${apiEndPoints.getCart}/${apiEndPoints.remove}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

/**
 * Drops every unavailable row (`status: "0"`) in one call — WEB_PARITY_V4.0.2
 * §1.5 "Clear All". Takes no parameters: the server decides which rows are
 * dead. Re-read `getCart` afterwards; the reply is only an acknowledgement.
 */
export const clearUnavailableCartItems = async (): Promise<RemoveFromCartResponse> => {
  const response = await api.post<RemoveFromCartResponse>(
    `${apiEndPoints.getCart}/${apiEndPoints.clearUnavailableCart}`,
    null,
    { headers: moduleHeader() }
  );
  return response.data;
};

export const deleteCart = async (): Promise<RemoveFromCartResponse> => {
  const formData: LooseFormData = new FormData();
  formData.append("is_remove_all", 1);
  const response = await api.post<RemoveFromCartResponse>(
    `${apiEndPoints.getCart}/${apiEndPoints.remove}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

export interface GetGuestCartParams extends LatLng {
  /** Comma-separated variant ids. */
  variant_ids?: string;
  /** Comma-separated quantities, same order as `variant_ids`. */
  quantities?: string;
}

export const getGuestCart = async ({
  latitude,
  longitude,
  variant_ids,
  quantities,
}: GetGuestCartParams): Promise<ApiResponse<CartData>> => {
  const params = {
    latitude: latitude,
    longitude: longitude,
    variant_ids: variant_ids,
    quantities: quantities,
  };
  const response = await api.get<ApiResponse<CartData>>(
    `${apiEndPoints.getCart}/${apiEndPoints.getGuestCart}`,
    { params, headers: moduleHeader() }
  );
  return response.data;
};

// Address Apis
export const getAddress = async (): Promise<ApiResponse<Address[]>> => {
  const response = await api.get<ApiResponse<Address[]>>(`${apiEndPoints.getAddress}`);
  return response.data;
};

export interface AddAddressParams {
  name: string;
  mobile: string;
  /** Usually "Home" | "Office" | "Other". */
  type: string;
  address: string;
  landmark: string;
  area: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  /** Misspelt on purpose — part of the contract (sent as `latitude`). */
  latitiude?: Numeric;
  longitude?: Numeric;
  is_default?: Flag;
  alternate_mobile?: Nullable<string>;
}

export const addAddress = async ({
  name,
  mobile,
  type,
  address,
  landmark,
  area,
  pincode,
  city,
  state,
  country,
  latitiude,
  longitude,
  is_default = 1,
  alternate_mobile = "",
}: AddAddressParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("name", name);
  formData.append("mobile", mobile);
  formData.append("type", type);
  formData.append("address", address);
  formData.append("landmark", landmark);
  formData.append("area", area);
  formData.append("pincode", pincode);
  formData.append("city", city);
  formData.append("state", state);
  formData.append("country", country);
  formData.append("alternate_mobile", alternate_mobile ? alternate_mobile : "");
  formData.append("latitude", latitiude);
  formData.append("longitude", longitude);
  formData.append("is_default", is_default ? 1 : 0);
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.getAddress}/${apiEndPoints.add}`,
    formData
  );
  return response.data;
};
export interface UpdateAddressParams extends AddAddressParams {
  id: Id;
}

export const updateAddress = async ({
  id,
  name,
  mobile,
  type,
  address,
  landmark,
  area,
  pincode,
  city,
  state,
  country,
  latitiude,
  longitude,
  is_default = 1,
  alternate_mobile = "",
}: UpdateAddressParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("id", id);
  formData.append("name", name);
  formData.append("mobile", mobile);
  formData.append("type", type);
  formData.append("address", address);
  formData.append("landmark", landmark);
  formData.append("area", area);
  formData.append("pincode", pincode);
  formData.append("city", city);
  formData.append("state", state);
  formData.append("country", country);
  formData.append("alternate_mobile", alternate_mobile ? alternate_mobile : "");
  formData.append("latitude", latitiude);
  formData.append("longitude", longitude);
  formData.append("is_default", is_default ? 1 : 0);
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.getAddress}/${apiEndPoints.update}`,
    formData
  );
  return response.data;
};
export interface DeleteAddressParams {
  id: Id;
}

export const deleteAddress = async ({ id }: DeleteAddressParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("id", id);
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.getAddress}/${apiEndPoints.deleteItem}`,
    formData
  );
  return response.data;
};

// wishlists api
export interface GetFavoriteParams extends LatLng, PageParams {}

export const getFavorite = async ({ latitude, longitude, limit, offset }: GetFavoriteParams): Promise<ApiResponse<Product[]>> => {
  const params = {
    latitude: latitude,
    longitude: longitude,
    limit: limit,
    offset: offset,
  };
  const response = await api.get<ApiResponse<Product[]>>(apiEndPoints.getFavorite, {
    params,
    headers: moduleHeader(),
  });
  return response.data;
};
export interface FavoriteParams {
  /** Required by the API; optional here because callers pass `product?.id`. */
  product_id?: Id;
}

export const addToFavorite = async ({ product_id }: FavoriteParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("product_id", product_id);
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.getFavorite}/${apiEndPoints.add}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};
export const removeFromFavorite = async ({ product_id }: FavoriteParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("product_id", product_id);
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.getFavorite}/${apiEndPoints.remove}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

// promocode api
export interface GetPromoParams {
  /** Cart subtotal the offers are evaluated against. */
  amount?: Numeric;
}

export const getPromo = async ({ amount = 0 }: GetPromoParams): Promise<ApiResponse<PromoCode[]>> => {
  const params = { amount: amount };
  const response = await api.get<ApiResponse<PromoCode[]>>(`${apiEndPoints.getPromoCode}`, {
    params,
    headers: moduleHeader(),
  });
  return response.data;
};
export interface SetPromoCodeParams {
  promoCodeName?: string;
  /** Cart subtotal (sent as `total`). */
  amount?: Numeric;
}

export const setPromoCode = async ({ promoCodeName, amount = 0 }: SetPromoCodeParams): Promise<ApiResponse<AppliedPromoCode>> => {
  const params = { promo_code: promoCodeName, total: amount };
  const response = await api.post<ApiResponse<AppliedPromoCode>>(
    `${apiEndPoints.getPromoCode}/${apiEndPoints.setPromoCode}`,
    {},
    { params, headers: moduleHeader() }
  );
  return response.data;
};

// Checkout api
// X-Module-Id decides everything here: without it the endpoint answers
// `time_slots_is_enabled: 0` with no slots at all, which reads as "this module
// has no delivery scheduling".
export const getTimeSlots = async (): Promise<ApiResponse<TimeSlotsResponse>> => {
  const response = await api.get<ApiResponse<TimeSlotsResponse>>(
    `${apiEndPoints.getSettings}/${apiEndPoints.getTimeSlot}`,
    { headers: moduleHeader() }
  );
  return response.data;
};
/** One grouped prescription: the cart lines it covers and its image(s). */
export interface PlaceOrderPrescriptionGroup {
  productVariantIds?: Id[];
  /** Missing entries are skipped. */
  images?: (File | Blob | null | undefined)[];
}

export interface PlaceOrderParams {
  /** Forwarded from the checkout cart (`CartData.product_variant_id`). */
  productVariantId?: Id;
  /** Forwarded from the checkout cart (`CartData.quantity`). */
  quantity?: Id;
  total?: Numeric;
  deliveryCharge?: Numeric;
  finalTotal?: Numeric;
  /** Checkout payment method; "wallet" is sent as "Wallet". */
  paymentMethod?: Nullable<string>;
  addressId?: Id;
  deliveryTime?: string;
  walletBalance?: Numeric;
  walletUsed?: boolean;
  orderNote?: Nullable<string>;
  promocodeId?: Id;
  /** Required when `paymentMethod` is "Credit". */
  installmentPlanId?: Id;
  /** Order status code (1 payment pending, 2 received). */
  status?: number;
  order_type?: OrderType;
  /** Legacy flat list of prescription images. */
  prescription?: (File | Blob)[];
  prescriptionGroups?: PlaceOrderPrescriptionGroup[];
}

export const placeOrder = async ({
  productVariantId,
  quantity,
  total,
  deliveryCharge,
  finalTotal,
  paymentMethod,
  addressId,
  deliveryTime,
  walletBalance,
  walletUsed,
  orderNote,
  promocodeId = 0,
  installmentPlanId,
  status,
  order_type = "doorstep",
  prescription,
  prescriptionGroups,
}: PlaceOrderParams): Promise<ApiResponse<PlaceOrderResponseData>> => {
  let finalPaymentMethod = paymentMethod;
  if (paymentMethod == "wallet") {
    finalPaymentMethod = "Wallet";
  }
  const formData: LooseFormData = new FormData();
  formData.append("product_variant_id", productVariantId);
  formData.append("quantity", quantity);
  formData.append("total", total);
  formData.append("delivery_charge", deliveryCharge);
  formData.append("final_total", finalTotal);
  formData.append("payment_method", finalPaymentMethod);
  formData.append("address_id", addressId);
  formData.append("status", status);
  formData.append("order_type", order_type);
  formData.append("delivery_time", deliveryTime);
  if (walletUsed) {
    formData.append("wallet_used", 1);
    formData.append("wallet_balance", walletBalance);
  }
  if (orderNote !== "" && orderNote !== null && orderNote !== undefined) {
    formData.append("order_note", orderNote);
  }
  if (promocodeId !== 0) {
    formData.append("promocode_id", promocodeId);
  }
  if (finalPaymentMethod === "Credit" && installmentPlanId) {
    formData.append("installment_plan_id", installmentPlanId);
  }
  // Grouped prescriptions: each group maps selected cart lines to its image(s).
  if (Array.isArray(prescriptionGroups) && prescriptionGroups.length > 0) {
    prescriptionGroups.forEach((group, i) => {
      const variantIds = group?.productVariantIds || [];
      const images = group?.images || [];
      if (variantIds.length > 0) {
        formData.append(
          `prescriptions[${i}][product_variant_ids]`,
          variantIds.join(",")
        );
      }
      images.forEach((file) => {
        if (!file) return;
        formData.append(`prescriptions[${i}][images][]`, file);
        // Backward-compat: also send a flat list for the current (old) API.
        formData.append("prescription_images[]", file);
      });
    });
  }
  // Legacy flat list (kept so existing callers keep working).
  if (Array.isArray(prescription) && prescription.length > 0) {
    prescription.forEach((file) => {
      formData.append("prescription_images[]", file);
    });
  }
  const response = await api.post<ApiResponse<PlaceOrderResponseData>>(`${apiEndPoints.placeOrder}`, formData, {
    headers: moduleHeader(),
  });
  return response.data;
};
export interface InitiateTransactionParams {
  /** Omitted for wallet top-ups and subscriptions. */
  orderId?: Nullable<Id>;
  /** Capitalised gateway name, e.g. "Razorpay", "Stripe". */
  paymentMethod: string;
  type: TransactionType;
  /** Only sent for `type: "wallet"` when non-zero. */
  walletAmount?: Numeric;
  /** Only sent for `type: "subscription"`. */
  subscriptionPlanId?: Id;
}

export const initiateTrasaction = async ({
  orderId,
  paymentMethod,
  type,
  walletAmount = 0,
  subscriptionPlanId = 0,
}: InitiateTransactionParams): Promise<ApiResponse<InitiateTransactionData>> => {
  const formData: LooseFormData = new FormData();
  if (orderId) {
    formData.append("order_id", orderId);
  }
  formData.append("payment_method", paymentMethod);
  formData.append("type", type);
  formData.append("request_from", "website");
  if (type == "wallet" && walletAmount != 0) {
    formData.append("wallet_amount", walletAmount);
  }
  if(type == "subscription"){
    formData.append("subscription_plan_id", subscriptionPlanId);
  }
  const response = await api.post<ApiResponse<InitiateTransactionData>>(
    `${apiEndPoints.initiateTrasaction}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};
export interface AddTransactionParams {
  /** Omitted for wallet top-ups and subscriptions. */
  orderId?: Nullable<Id>;
  /** Gateway payment/reference id. */
  transactionId: string;
  /** Capitalised gateway name, e.g. "Razorpay", "Stripe". */
  paymentMethod: string;
  type: TransactionType;
  /** Only sent for `type: "subscription"`. */
  subscriptionPlanId?: Id;
  /** Only sent for `type: "wallet"` when non-zero. */
  walletAmount?: Numeric;
  /**
   * Razorpay Checkout's success response. The backend verifies the payment
   * signature from these three, so a Razorpay transaction without them fails.
   */
  razorpay?: RazorpayPaymentResult;
}

export interface RazorpayPaymentResult {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export const addTransaction = async ({
  orderId,
  transactionId,
  paymentMethod,
  type,
  subscriptionPlanId = 0,
  walletAmount = 0,
  razorpay,
}: AddTransactionParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  if (orderId) {
    formData.append("order_id", orderId);
  }
  if (walletAmount != 0 && type == "wallet") {
    formData.append("wallet_amount", walletAmount);
  }
  if(type == "subscription"){
    formData.append(
      "subscription_plan_id",
      subscriptionPlanId
    )
  }
  formData.append("transaction_id", transactionId);
  if (razorpay) {
    formData.append("razorpay_payment_id", razorpay.razorpay_payment_id);
    formData.append("razorpay_order_id", razorpay.razorpay_order_id);
    formData.append("razorpay_signature", razorpay.razorpay_signature);
  }
  formData.append("type", type);
  formData.append("payment_method", paymentMethod);
  formData.append("request_from", "website");
  formData.append("device_type", "web");
  formData.append("app_version", "1.0");
  const response = await api.post<ApiResponse<unknown>>(`${apiEndPoints.addTransaction}`, formData, {
    headers: moduleHeader(),
  });
  return response.data;
};
export interface OrderIdParams {
  orderId?: Id;
}

export const deleteOrder = async ({ orderId }: OrderIdParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("order_id", orderId);
  const response = await api.post<ApiResponse<unknown>>(`${apiEndPoints.deleteOrder}`, formData);
  return response.data;
};

// Fetch Notifications
export const getNotifications = async ({ limit = 7, offset = 0 }: PageParams): Promise<ApiResponse<Notification[]>> => {
  const params = { limit, offset };
  const response = await api.get<ApiResponse<Notification[]>>(`${apiEndPoints.getNotification}`, { params });
  return response.data;
};

export const getFAQs = async ({ limit = 7, offset = 0 }: PageParams): Promise<ApiResponse<Faq[]>> => {
  const params = { limit, offset };
  const response = await api.get<ApiResponse<Faq[]>>(`${apiEndPoints.getFaq}`, { params });
  return response.data;
};

export interface GetOrdersParams extends PageParams {
  /** Fetch a single order (OrderDetail). */
  orderId?: Id;
  /** `1` = active orders, `0` = previous orders. */
  type?: number;
  /** "" = all order types. */
  orderType?: OrderType | "";
}

export const getOrders = async ({
  limit,
  offset,
  orderId,
  type,
  orderType,
}: GetOrdersParams): Promise<ApiResponse<Order[]>> => {
  const params: Record<string, unknown> = { limit: limit, offset: offset, type: type };
  if (orderId) {
    params.order_id = orderId;
  }
  if (orderType != "") {
    params.order_type = orderType;
  }
  const response = await api.get<ApiResponse<Order[]>>(`${apiEndPoints.getOrders}`, {
    params,
    headers: moduleHeader(),
  });
  return response.data;
};

export interface ChangeOrderStatusParams {
  orderId?: Id;
  orderItemId?: Id;
  /** `7` = cancel, `8` = return. */
  status: number;
  reason?: string;
}

export const changeOrderStatus = async ({
  orderId,
  orderItemId,
  status,
  reason,
}: ChangeOrderStatusParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("order_id", orderId);
  formData.append("order_item_id", orderItemId);
  formData.append("status", status);
  if (reason) {
    formData.append("reason", reason);
  }
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.updateOrderStatus}`,
    formData
  );
  return response.data;
};

export interface ReviewProductParams {
  productId?: Id;
  /** Star count. */
  rating?: Nullable<number>;
  review?: string;
  images?: (File | Blob)[];
}

export const reviewProduct = async ({ productId, rating, review, images }: ReviewProductParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("product_id", productId);
  formData.append("rate", rating);
  formData.append("review", review);
  // No images → `0 < undefined` is false and the loop is skipped.
  for (let i = 0; i < (images?.length as number); i++) {
    formData.append(`image[${i}]`, images![i]);
  }
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.getProducts}/${apiEndPoints.rating}/${apiEndPoints.add}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

export interface GetProductRatingParams {
  ratingId?: Id;
}

export const getProductRating = async ({ ratingId }: GetProductRatingParams): Promise<ApiResponse<ProductReview>> => {
  const formData: LooseFormData = new FormData();
  formData.append("id", ratingId);
  const response = await api.post<ApiResponse<ProductReview>>(
    `${apiEndPoints.getProducts}/${apiEndPoints.rating}/${apiEndPoints.edit}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

export interface UpdateReviewProductParams {
  ratingId?: Id;
  /** Star count. */
  rating?: Nullable<number>;
  review?: Nullable<string>;
  /** Ids of existing review images to delete; sent as "[1,2]". */
  deleteImages?: Id[];
  images?: (File | Blob)[];
}

export const updateReviewProduct = async ({
  ratingId,
  rating,
  review,
  deleteImages,
  images,
}: UpdateReviewProductParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("id", ratingId);
  formData.append("rate", rating);
  formData.append("review", review);
  formData.append("deleteImageIds", `[${deleteImages}]`);
  // No images → `0 < undefined` is false and the loop is skipped.
  for (let i = 0; i < (images?.length as number); i++) {
    formData.append(`image[${i}]`, images![i]);
  }
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.getProducts}/${apiEndPoints.rating}/${apiEndPoints.update}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

/** Returns the full axios response (not `response.data`): the PDF is `response.data`. */
export const downloadInvoice = async ({ orderId }: OrderIdParams): Promise<AxiosResponse<Blob>> => {
  const formData: LooseFormData = new FormData();
  formData.append("order_id", orderId);
  const response = await api.post<Blob>(`${apiEndPoints.getInvoice}`, formData, {
    responseType: "blob",
    headers: moduleHeader(),
  });
  return response;
};

export interface GetUserTransactionsParams extends PageParams {
  type: "transactions" | "wallet";
}

/** `Transaction[]` for `type: "transactions"`, `WalletTransaction[]` for `type: "wallet"`. */
export type UserTransactionsData = Transaction[] | WalletTransaction[];

export const getUserTransactions = async ({ limit, offset, type }: GetUserTransactionsParams): Promise<ApiResponse<UserTransactionsData>> => {
  const params = { limit: limit, offset: offset, type: type };
  const response = await api.get<ApiResponse<UserTransactionsData>>(`${apiEndPoints.getTransactions}`, { params });
  return response.data;
};

export const liveOrderTracking = async ({ orderId }: OrderIdParams): Promise<ApiResponse<LiveTracking>> => {
  const params = {
    order_id: orderId,
  };
  const response = await api.get<ApiResponse<LiveTracking>>(`${apiEndPoints.liveTracking}`, { params });
  return response.data;
};

/**
 * The rider's position plus the road route to the drop (WEB_PARITY_V4.0.2 §3.3).
 * The server caches it for 10 s. `route.duration` of 0 means there is no road
 * route, not that the rider has arrived.
 */
export const getLiveTrackingRoute = async ({ orderId }: OrderIdParams): Promise<ApiResponse<LiveTrackingRoute>> => {
  const response = await api.get<ApiResponse<LiveTrackingRoute>>(apiEndPoints.liveTrackingRoute, {
    params: { order_id: orderId },
    headers: moduleHeader(),
  });
  return response.data;
};

export interface GetSellersParams extends PageParams, LatLng {}

export const getSellers = async ({ limit, offset, latitude, longitude }: GetSellersParams): Promise<ApiResponse<Seller[]>> => {
  const params = {
    limit,
    offset,
    latitude,
    longitude,
  };
  const response = await api.get<ApiResponse<Seller[]>>(`${apiEndPoints.getShopBySellers}`, {
    params,
    headers: moduleHeader(),
  });
  return response.data;
};

export interface GetCountriesParams extends PageParams, LatLng {}

/** `countries` also carries the list-level card colours next to `data`. */
export type CountriesResponse = ApiResponse<Country[]> & CountryBackgroundSettings;

export const getCountries = async ({ limit, offset, latitude, longitude }: GetCountriesParams): Promise<CountriesResponse> => {
  const params = {
    limit,
    offset,
    latitude,
    longitude,
  };
  const response = await api.get<CountriesResponse>(`${apiEndPoints.getShopByCountries}`, {
    params,
    headers: moduleHeader(),
  });
  return response.data;
};

export interface VerifyUserByPhoneNumParams {
  mobile: string;
  countryCode: string;
  /** "phone". */
  type: string;
}

export const verifyUserByPhoneNum = async ({ mobile, countryCode, type }: VerifyUserByPhoneNumParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("mobile", mobile);
  formData.append("country_code", countryCode);
  formData.append("type", type);
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.verifyUserByPhoneNum}`,
    formData
  );
  return response.data;
};

export interface GetOrderStatusPhonepeParams {
  token?: string;
  /** PhonePe `merchantOrderId`. */
  transaction_id?: string;
}

export const getOrderStatusPhonepe = async ({ token, transaction_id }: GetOrderStatusPhonepeParams): Promise<ApiResponse<PhonePeOrderStatusData>> => {
  const params = {
    token: token,
    transaction_id: transaction_id,
  };

  const response = await api.get<ApiResponse<PhonePeOrderStatusData>>(apiEndPoints.orderStatusPhonepe, { params });
  return response.data;
};

// Blogs section API's
export interface GetBlogsCategoriesParams extends PageParams {
  search?: string;
}

export const getBlogsCategories = async ({
  offset = 0,
  limit = 10,
  search = "",
}: GetBlogsCategoriesParams): Promise<ApiResponse<BlogCategory[]>> => {
  const params = {
    limit,
    offset,
    ...(search != "" ? { search } : {}),
  };

  const response = await api.get<ApiResponse<BlogCategory[]>>(apiEndPoints.blogCategories, { params });
  return response.data;
};

export interface GetBlogsParams extends PageParams {
  /** Fetch one post (returned as a one-item list). */
  slug?: string;
  categoryId?: Nullable<Id>;
  tag_id?: Nullable<Id>;
}

export const getBlogs = async ({
  offset,
  limit,
  slug,
  categoryId = null,
  tag_id = null,
}: GetBlogsParams): Promise<ApiResponse<Blog[]>> => {
  const params = {
    limit,
    offset,
    slug,
    ...(categoryId !== null ? { category_id: categoryId } : null),
    ...(tag_id !== null ? { tag_id: tag_id } : null),
  };
  const response = await api.get<ApiResponse<Blog[]>>(apiEndPoints.blogs, { params });
  return response.data;
};

export interface SetBlogCountParams {
  blogId?: Id;
}

export const setBlogCount = async ({ blogId }: SetBlogCountParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("blog_id", blogId);
  const response = await api.post<ApiResponse<unknown>>(apiEndPoints.blogViewCount, formData);
  return response.data;
};

export interface GetMostViewedBlogsParams {
  /** Ignored: not sent to the API. */
  limit?: number;
}

export const getMostViewedBlogs = async ({ limit = 5 }: GetMostViewedBlogsParams): Promise<ApiResponse<Blog[]>> => {
  const response = await api.get<ApiResponse<Blog[]>>(
    `${apiEndPoints.blogs}/${apiEndPoints.mostViewedBlogs}`
  );
  return response.data;
};

export interface SetProductRequestParams {
  image?: Nullable<File>;
  description?: string;
}

export const setProductRequest = async ({ image, description }: SetProductRequestParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  if (description) {
    formData.append("description", description);
  }
  if (image) {
    formData.append("image", image);
  }
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.userProductRequest}/${apiEndPoints?.add}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

export const getRequestedProducts = async ({ limit = 10, offset = 0 }: PageParams): Promise<ApiResponse<RequestedProduct[]>> => {
  const params = {
    limit: limit,
    offset: offset,
  };
  const response = await api.get<ApiResponse<RequestedProduct[]>>(
    `${apiEndPoints.userProductRequest}/${apiEndPoints?.list}`,
    { params, headers: moduleHeader() }
  );
  return response.data;
};

export const getTags = async (): Promise<ApiResponse<BlogTag[]>> => {
  const response = await api.get<ApiResponse<BlogTag[]>>(`${apiEndPoints.blogTags}`);
  return response.data;
};

export interface ProductIdParams {
  productId?: Id;
}

export const addRecentlyViewedProduct = async ({ productId }: ProductIdParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("product_id", productId);
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.getSection}/${apiEndPoints.addRecentlyViewedProduct}`,
    formData,
    { headers: moduleHeader() }
  );
  return response.data;
};

export const getRecentlyViewedProducts = async ({ productId }: ProductIdParams): Promise<ApiResponse<Product[]>> => {
  const params = {
    product_id: productId,
  };
  const response = await api.get<ApiResponse<Product[]>>(
    `${apiEndPoints.getProducts}/${apiEndPoints.recentlyVisited}`,
    { params, headers: moduleHeader() }
  );
  return response.data;
};

/** `data` of `getSubscriptionPlans()`. */
export interface SubscriptionPlansData {
  plans?: SubscriptionPlan[];
}

export const getSubscriptionPlans = async (): Promise<ApiResponse<SubscriptionPlansData>> => {
  const response = await api.get<ApiResponse<SubscriptionPlansData>>(`${apiEndPoints.subscriptionPlans}`);
  return response.data;
};

export const getUserActivePlan = async (): Promise<ApiResponse<UserActivePlan>> => {
  const response = await api.get<ApiResponse<UserActivePlan>>(`${apiEndPoints.userActivePlan}`);
  return response.data;
};

export const getSubscriptionFaqs = async ({ offset, limit }: PageParams): Promise<ApiResponse<Faq[]>> => {
  const params = {
    offset,
    limit,
  };
  const response = await api.get<ApiResponse<Faq[]>>(`${apiEndPoints.subscriptionFaqs}`, { params });
  return response.data;
};

export const getMailSettings = async (): Promise<ApiResponse<MailSettings[]>> => {
    const response = await api.get<ApiResponse<MailSettings[]>>(`${apiEndPoints.mailSettings}`);
    return response.data;
};

/** Each field is a comma-separated list, one entry per order status. */
export interface UpdateMailSettingsParams {
  status_ids: string;
  mail_statuses: string;
  mobile_statuses: string;
  sms_status: string;
}

export const updateMailSettings = async ({
  status_ids,
  mail_statuses,
  mobile_statuses,
  sms_status,
}: UpdateMailSettingsParams): Promise<ApiResponse<unknown>> => {
  const formData: LooseFormData = new FormData();
  formData.append("status_ids", status_ids);
  formData.append("mail_statuses", mail_statuses);
  formData.append("mobile_statuses", mobile_statuses);
  formData.append("sms_status", sms_status);
  const response = await api.post<ApiResponse<unknown>>(
    `${apiEndPoints.mailSettings}/${apiEndPoints.save}`,
    formData
  );
  return response.data;
};

// Credit & installments
export const getCreditStatus = async (): Promise<ApiResponse<CreditStatusData>> => {
  const response = await api.get<ApiResponse<CreditStatusData>>(apiEndPoints.creditStatus);
  return response.data;
};

export interface ApplyForCreditParams {
  documents: File[];
  /** Same order as `documents`. */
  documentTypes?: string[];
  requestedLimit?: Numeric;
}

export const applyForCredit = async ({
  documents,
  documentTypes = [],
  requestedLimit,
}: ApplyForCreditParams): Promise<ApiResponse<{ application_id: Id }>> => {
  const formData: LooseFormData = new FormData();
  documents.forEach((file) => formData.append("documents[]", file));
  documentTypes.forEach((type) => formData.append("document_types[]", type));
  if (requestedLimit !== undefined && requestedLimit !== "") {
    formData.append("requested_limit", requestedLimit);
  }
  const response = await api.post<ApiResponse<{ application_id: Id }>>(apiEndPoints.creditApply, formData);
  return response.data;
};

export interface GetCreditPlansParams {
  /** Defaults to the current cart on the server. */
  productIds?: Id[];
  /** Checkout total; when sent every plan includes a `quote`. */
  amount?: Numeric;
}

export const getCreditPlans = async ({
  productIds,
  amount,
}: GetCreditPlansParams = {}): Promise<ApiResponse<CreditPlansData>> => {
  const params: Record<string, string | number> = {};
  if (productIds?.length) params.product_ids = productIds.join(",");
  if (amount !== undefined) params.amount = amount;
  const response = await api.get<ApiResponse<CreditPlansData>>(apiEndPoints.creditPlans, { params });
  return response.data;
};

export interface GetCreditQuoteParams {
  installmentPlanId: Id;
  /** Checkout final total incl. delivery and charges. */
  amount: Numeric;
  productIds?: Id[];
}

export const getCreditQuote = async ({
  installmentPlanId,
  amount,
  productIds,
}: GetCreditQuoteParams): Promise<ApiResponse<CreditQuoteData>> => {
  const formData: LooseFormData = new FormData();
  formData.append("installment_plan_id", installmentPlanId);
  formData.append("amount", amount);
  if (productIds?.length) formData.append("product_ids", productIds.join(","));
  const response = await api.post<ApiResponse<CreditQuoteData>>(apiEndPoints.creditQuote, formData);
  return response.data;
};

export const getCreditDashboard = async (): Promise<ApiResponse<CreditDashboardData>> => {
  const response = await api.get<ApiResponse<CreditDashboardData>>(apiEndPoints.creditDashboard);
  return response.data;
};

export interface GetCreditInstallmentsParams {
  status?: InstallmentStatus | "upcoming";
  orderId?: Id;
  page?: number;
  limit?: number;
}

export const getCreditInstallments = async ({
  status,
  orderId,
  page = 1,
  limit = 20,
}: GetCreditInstallmentsParams = {}): Promise<ApiResponse<Installment[]>> => {
  const params: Record<string, string | number> = { page, limit };
  if (status) params.status = status;
  if (orderId) params.order_id = orderId;
  const response = await api.get<ApiResponse<Installment[]>>(apiEndPoints.creditInstallments, { params });
  return response.data;
};

export const getCreditOrder = async ({ orderId }: OrderIdParams): Promise<ApiResponse<CreditOrderDetailData>> => {
  const response = await api.get<ApiResponse<CreditOrderDetailData>>(apiEndPoints.creditOrder, {
    params: { order_id: orderId },
  });
  return response.data;
};

export interface PayInstallmentWalletParams {
  installmentId: Id;
  /** Omit to pay the full remaining amount of the installment. */
  amount?: Numeric;
}

export const payInstallmentWithWallet = async ({
  installmentId,
  amount,
}: PayInstallmentWalletParams): Promise<ApiResponse<CreditPayWalletData>> => {
  const formData: LooseFormData = new FormData();
  formData.append("installment_id", installmentId);
  if (amount !== undefined && amount !== "") formData.append("amount", amount);
  const response = await api.post<ApiResponse<CreditPayWalletData>>(apiEndPoints.creditPayWallet, formData);
  return response.data;
};

export interface CreditListParams {
  page?: number;
  limit?: number;
}

export const getCreditLedger = async ({
  page = 1,
  limit = 20,
}: CreditListParams = {}): Promise<ApiResponse<CreditLedgerEntry[]>> => {
  const response = await api.get<ApiResponse<CreditLedgerEntry[]>>(apiEndPoints.creditLedger, {
    params: { page, limit },
  });
  return response.data;
};

export const getCreditPayments = async ({
  page = 1,
  limit = 20,
}: CreditListParams = {}): Promise<ApiResponse<CreditPayment[]>> => {
  const response = await api.get<ApiResponse<CreditPayment[]>>(apiEndPoints.creditPayments, {
    params: { page, limit },
  });
  return response.data;
};

// Store coupons & wallet recharge
export const redeemCoupon = async ({ code }: { code: string }): Promise<ApiResponse<CouponRedeemData>> => {
  const formData: LooseFormData = new FormData();
  formData.append("code", code);
  const response = await api.post<ApiResponse<CouponRedeemData>>(apiEndPoints.couponRedeem, formData);
  return response.data;
};

export const getCouponHistory = async ({
  page = 1,
  limit = 20,
}: CreditListParams = {}): Promise<ApiResponse<CouponHistoryEntry[]>> => {
  const response = await api.get<ApiResponse<CouponHistoryEntry[]>>(apiEndPoints.couponHistory, {
    params: { page, limit },
  });
  return response.data;
};
