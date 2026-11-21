import { describe, expect, it } from "vitest";
import { couponErrorKey, normalizeCouponCode } from "./coupon";

describe("normalizeCouponCode", () => {
  it("uppercases and trims", () => {
    expect(normalizeCouponCode("  spd-7k9q-4m2x ")).toBe("SPD-7K9Q-4M2X");
  });

  it("collapses inner whitespace", () => {
    expect(normalizeCouponCode("spd   7k9q  4m2x")).toBe("SPD 7K9Q 4M2X");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeCouponCode("   ")).toBe("");
  });
});

describe("couponErrorKey", () => {
  it("maps known codes", () => {
    expect(couponErrorKey("coupon_expired")).toBe("coupon_err_coupon_expired");
    expect(couponErrorKey("validation_error")).toBe("coupon_err_validation_error");
  });

  it("falls back for unknown or missing codes", () => {
    expect(couponErrorKey("brand_new_code")).toBe("coupon_err_something_went_wrong");
    expect(couponErrorKey(undefined)).toBe("coupon_err_something_went_wrong");
  });
});
