const KNOWN_ERROR_CODES = [
  "coupon_invalid",
  "coupon_already_redeemed",
  "coupon_inactive",
  "coupon_expired",
  "validation_error",
  "something_went_wrong",
] as const;

/** Trims, uppercases and collapses inner whitespace; the server also normalises. */
export const normalizeCouponCode = (input: string): string => input.trim().replace(/\s+/g, " ").toUpperCase();

/** Translation key for a redeem failure `code`. */
export const couponErrorKey = (code: string | null | undefined): string =>
  code && (KNOWN_ERROR_CODES as readonly string[]).includes(code) ? `coupon_err_${code}` : "coupon_err_something_went_wrong";
