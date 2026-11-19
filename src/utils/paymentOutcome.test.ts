import { describe, expect, it } from "vitest";
import { mayDeleteOrder, resolveReturnOutcome, resolveVerifyOutcome } from "./paymentOutcome";

describe("resolveVerifyOutcome", () => {
  // The bug §11 describes: order_status_phonepe answers HTTP 200 with an empty
  // body. Reading that as "not success" deleted orders that had been paid.
  it("calls an empty body unresolved, never failed", () => {
    expect(resolveVerifyOutcome(undefined)).toBe("unresolved");
    expect(resolveVerifyOutcome(null)).toBe("unresolved");
    expect(resolveVerifyOutcome({})).toBe("unresolved");
    expect(resolveVerifyOutcome({ status: "" })).toBe("unresolved");
  });

  it("reads the states PhonePe does send", () => {
    expect(resolveVerifyOutcome({ status: "COMPLETED" })).toBe("success");
    expect(resolveVerifyOutcome({ status: "FAILED" })).toBe("failed");
    expect(resolveVerifyOutcome({ status: "PENDING" })).toBe("pending");
  });

  it("does not guess at a state it has never seen", () => {
    expect(resolveVerifyOutcome({ status: "SOMETHING_NEW" })).toBe("unresolved");
  });
});

describe("resolveReturnOutcome", () => {
  it("reads the usual success spellings", () => {
    expect(resolveReturnOutcome({ status: "success" })).toBe("success");
    expect(resolveReturnOutcome({ status: "PAYMENT_SUCCESS" })).toBe("success");
    expect(resolveReturnOutcome({ status_code: "200", transaction_status: "capture" })).toBe("success");
  });

  it("reads an explicit failure as a failure", () => {
    expect(resolveReturnOutcome({ status: "failed" })).toBe("failed");
    expect(resolveReturnOutcome({ status: "cancelled" })).toBe("failed");
    expect(resolveReturnOutcome({ transaction_status: "declined" })).toBe("failed");
  });

  // PayPal's two return paths report differently; the old default of "failed"
  // is what made a settled payment look cancelled.
  it("calls an unrecognised or empty return unresolved", () => {
    expect(resolveReturnOutcome({})).toBe("unresolved");
    expect(resolveReturnOutcome({ status: "token=EC-4711&PayerID=ABC" })).toBe("unresolved");
    expect(resolveReturnOutcome(null)).toBe("unresolved");
  });

  it("ignores case and padding", () => {
    expect(resolveReturnOutcome({ status: "  Success " })).toBe("success");
    expect(resolveReturnOutcome({ status: "CANCELLED" })).toBe("failed");
  });
});

describe("mayDeleteOrder", () => {
  // Deleting on anything softer than an explicit failure is how a paid order
  // gets torn down.
  it("only lets an explicit failure tear the order down", () => {
    expect(mayDeleteOrder("failed")).toBe(true);
    expect(mayDeleteOrder("unresolved")).toBe(false);
    expect(mayDeleteOrder("pending")).toBe(false);
    expect(mayDeleteOrder("success")).toBe(false);
  });
});
