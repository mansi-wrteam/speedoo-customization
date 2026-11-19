import { describe, expect, it } from "vitest";
import { couponShortfall, shortfallFrom } from "./promoUtils";

describe("shortfallFrom", () => {
  // These cases encode the "do not invent a number" rule: anything that isn't a
  // parseable, positive minimum has to collapse to null rather than to a guess.
  it.each([
    { subTotal: 150, min: 250, expected: 100, why: "under the minimum" },
    { subTotal: 250, min: 250, expected: null, why: "met exactly" },
    { subTotal: 260, min: 250, expected: null, why: "over the minimum" },
    { subTotal: 10, min: undefined, expected: null, why: "absent" },
    { subTotal: 10, min: "null", expected: null, why: "the string null" },
    { subTotal: 0, min: 0, expected: null, why: "never report the subtotal" },
    { subTotal: 10, min: "free", expected: null, why: "unparseable" },
  ])(
    "subtotal $subTotal with min_order_amount $min -> $expected ($why)",
    ({ subTotal, min, expected }) => {
      expect(shortfallFrom({ min_order_amount: min }, subTotal)).toBe(expected);
    }
  );

  it("accepts a numeric string minimum", () => {
    expect(shortfallFrom({ min_order_amount: "250" }, 90.3)).toBeCloseTo(159.7);
  });

  it("treats a missing offer as no shortfall", () => {
    expect(shortfallFrom(undefined, 100)).toBeNull();
  });
});

describe("couponShortfall", () => {
  const blocked = { is_applicable: 0, min_order_amount: 250 };

  it("explains a coupon blocked by the order amount", () => {
    expect(couponShortfall(blocked, 150)).toBe(100);
  });

  it("never shows a shortfall for an applicable coupon", () => {
    // The server already said yes — a stale minimum must not contradict it.
    expect(couponShortfall({ ...blocked, is_applicable: 1 }, 150)).toBeNull();
  });

  it("stays silent when a blocked coupon has no minimum", () => {
    // Expiry and usage caps also report is_applicable: 0. Telling someone to
    // add more to their cart would send them to spend money for nothing.
    expect(couponShortfall({ is_applicable: 0 }, 150)).toBeNull();
  });

  it("stays silent when the cart already clears the minimum", () => {
    // Blocked for some other reason, so the gap is not the explanation.
    expect(couponShortfall(blocked, 300)).toBeNull();
  });
});
