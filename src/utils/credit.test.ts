import { describe, expect, it } from "vitest";
import { blockedReasonKey, installmentRemaining, isCreditOrder } from "./credit";

describe("blockedReasonKey", () => {
  it("returns null when the user can buy on credit", () => {
    expect(blockedReasonKey(null)).toBeNull();
    expect(blockedReasonKey(undefined)).toBeNull();
    expect(blockedReasonKey("")).toBeNull();
  });

  it("returns the backend key for a known reason", () => {
    expect(blockedReasonKey("credit_account_suspended")).toBe("credit_account_suspended");
    expect(blockedReasonKey("credit_overdue_installments_block_purchase")).toBe(
      "credit_overdue_installments_block_purchase",
    );
  });

  it("falls back to a generic message for an unknown reason", () => {
    expect(blockedReasonKey("something_new")).toBe("credit_purchase_blocked");
  });
});

describe("installmentRemaining", () => {
  it("subtracts paid from amount, accepting numeric strings", () => {
    expect(installmentRemaining("525.00", "100.50")).toBe(424.5);
    expect(installmentRemaining(525, 0)).toBe(525);
  });

  it("never goes negative", () => {
    expect(installmentRemaining(100, 150)).toBe(0);
  });
});

describe("isCreditOrder", () => {
  it("matches the Credit payment method case-insensitively", () => {
    expect(isCreditOrder("Credit")).toBe(true);
    expect(isCreditOrder("credit")).toBe(true);
  });

  it("rejects other methods and empty values", () => {
    expect(isCreditOrder("COD")).toBe(false);
    expect(isCreditOrder(null)).toBe(false);
    expect(isCreditOrder(undefined)).toBe(false);
  });
});
