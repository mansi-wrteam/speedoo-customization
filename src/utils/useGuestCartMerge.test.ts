import { describe, expect, it } from "vitest";
import { isSellerMismatch } from "./useGuestCartMerge";

describe("isSellerMismatch", () => {
  // Trap 2: the refusal carries no error code. The ONLY signal is a `data` key
  // sitting next to status 0.
  it("is a refusal carrying a data key", () => {
    expect(isSellerMismatch({ status: 0, data: { one_seller_error_code: 1 } })).toBe(true);
    expect(isSellerMismatch({ status: 0, data: {} })).toBe(true);
  });

  it("is not a refusal without one", () => {
    expect(isSellerMismatch({ status: 0, message: "Out of stock" })).toBe(false);
    expect(isSellerMismatch({ status: 0, data: null })).toBe(false);
  });

  // A success carries `data` too on some endpoints — it must never be read as
  // a conflict, or a merged cart would prompt to replace itself.
  it("is never a success", () => {
    expect(isSellerMismatch({ status: 1, data: { one_seller_error_code: 1 } })).toBe(false);
    expect(isSellerMismatch({ status: 1 })).toBe(false);
  });

  it("survives a missing response", () => {
    expect(isSellerMismatch(null)).toBe(false);
    expect(isSellerMismatch(undefined)).toBe(false);
  });
});
