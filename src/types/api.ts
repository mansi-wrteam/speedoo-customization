// Response envelope returned by the customer API (see src/api/apiRoutes.js).
//
// Every apiRoutes function resolves to the axios body, i.e. this envelope —
// except downloadInvoice, which resolves to the full AxiosResponse<Blob>.
// Callers check success with `response.status == 1` (loose, sometimes a
// string), so `status` is kept wide on purpose.

export interface ApiResponse<T = unknown> {
  /** 1 = success, 0 = handled failure (message explains). */
  status: number | string;
  message?: string;
  data: T;
  /** Total record count on paginated lists (used for offset paging). */
  total?: number;
}

/** Products listing (`POST products`) adds the price range of the whole result set. */
export interface ProductListResponse<T = unknown> extends ApiResponse<T[]> {
  total_min_price?: number | string;
  total_max_price?: number | string;
}

/**
 * `settings` and `settings/payment_methods` return `data` as a base64 string
 * holding JSON. Decoded by the caller with `JSON.parse(atob(res.data))`.
 */
export type Base64JsonResponse = ApiResponse<string>;

/**
 * `customer/settings`. The realtime block is a SIBLING of `data`, not part of
 * the base64 payload (WEB_PARITY_V4.0.2 trap 6).
 */
export interface SettingsResponse extends Base64JsonResponse {
  realtime?: import("./models/settings").RealtimeSettings | null;
}

/** Raw axios body of the SEO endpoints fetched in getServerSideProps (no apiRoutes wrapper). */
export interface SeoApiBody<T = unknown> {
  status?: number | string;
  message?: string;
  data?: T;
}

/** Common paging arguments accepted by list endpoints. */
export interface PageParams {
  limit?: number;
  offset?: number;
}

/** Location arguments most catalogue endpoints take. */
export interface LatLng {
  latitude?: number | string;
  longitude?: number | string;
}
