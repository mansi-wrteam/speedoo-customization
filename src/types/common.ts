// Shared primitive aliases for API data.
//
// The backend is loose about types: ids, prices and 0/1 flags arrive as numbers
// in some payloads and as strings in others, and the app compares them with
// `==`. These aliases describe the data as it really arrives so existing
// comparisons keep compiling without being rewritten.

/** Record id. Usually a number; sometimes a numeric string (URL params, FormData echoes). */
export type Id = number | string;

/** Amount, price or quantity that may arrive as `12`, `12.5` or `"12.50"`. */
export type Numeric = number | string;

/** Backend boolean: `0 | 1`, occasionally `"0" | "1"` or `true | false`. Compared with `== 1`. */
export type Flag = number | string | boolean;

/** Date/time string as sent by the API (e.g. `"2026-09-24 10:21:00"` or ISO). */
export type DateString = string;

/** Absolute URL (images, redirects). */
export type Url = string;

export type Nullable<T> = T | null;
