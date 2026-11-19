import { describe, expect, it } from "vitest";
import {
  buyableFirst,
  getVariantPillLabels,
  hasOtherVariants,
  isCodAllowed,
  isUnavailableRow,
  isVariantBuyable,
  splitCartRows,
  swapQuantity,
  walletCoversOrder,
  walletTopUpShortfall,
} from "./cartRowUtils";
import type { ApiCartItem } from "@/types/models";

const row = (overrides: Partial<ApiCartItem> = {}) =>
  ({ product_id: 1, product_variant_id: 10, qty: 1, ...overrides }) as ApiCartItem;

describe("isUnavailableRow", () => {
  // Trap 1: the flag is the STRING "0", which is truthy.
  it("treats the string \"0\" as unavailable", () => {
    expect(isUnavailableRow(row({ status: "0" }))).toBe(true);
    expect(isUnavailableRow(row({ status: 0 }))).toBe(true);
  });

  it("leaves available and flagless rows alone", () => {
    expect(isUnavailableRow(row({ status: "1" }))).toBe(false);
    expect(isUnavailableRow(row())).toBe(false);
    expect(isUnavailableRow(null)).toBe(false);
  });
});

describe("splitCartRows", () => {
  it("keeps dead rows out of the shipment", () => {
    const { available, unavailable } = splitCartRows([
      row({ product_variant_id: 1 }),
      row({ product_variant_id: 2, status: "0" }),
      row({ product_variant_id: 3, status: "1" }),
    ]);
    expect(available.map((r) => r.product_variant_id)).toEqual([1, 3]);
    expect(unavailable.map((r) => r.product_variant_id)).toEqual([2]);
  });
});

describe("hasOtherVariants", () => {
  it("is true only above zero, numeric or string", () => {
    expect(hasOtherVariants(row({ other_variants_count: 2 }))).toBe(true);
    expect(hasOtherVariants(row({ other_variants_count: "3" }))).toBe(true);
    expect(hasOtherVariants(row({ other_variants_count: 0 }))).toBe(false);
    expect(hasOtherVariants(row())).toBe(false);
  });
});

describe("getVariantPillLabels", () => {
  it("prefers label over value, ordered by sequence", () => {
    const labels = getVariantPillLabels(
      row({
        attribute_values: [
          { id: 2, value: "Red", label: "Red", sequence: 2 },
          { id: 1, value: "100", label: "100 GM", sequence: 1 },
        ],
      })
    );
    expect(labels).toEqual(["100 GM", "Red"]);
  });

  it("falls back to value + short_code when there is no label", () => {
    expect(
      getVariantPillLabels(
        row({ attribute_values: [{ id: 1, value: "500", short_code: "ml" }] })
      )
    ).toEqual(["500 ml"]);
  });

  it("uses the measurement when the row has no attributes", () => {
    expect(getVariantPillLabels(row({ measurement: 500, stock_unit_name: "g" }))).toEqual([
      "500 g",
    ]);
  });
});

describe("isCodAllowed", () => {
  it("accepts either spelling of the charges flag", () => {
    expect(isCodAllowed({ sub_total: 0, is_cod_allowed: "1" }, {})).toBe(true);
    expect(isCodAllowed({ sub_total: 0, cod_allowed: "1" }, {})).toBe(true);
  });

  it("needs both the charges flag and the gateway flag", () => {
    expect(
      isCodAllowed({ sub_total: 0, is_cod_allowed: "1" }, { cod_payment_method: "0" })
    ).toBe(false);
    expect(
      isCodAllowed({ sub_total: 0, is_cod_allowed: "0" }, { cod_payment_method: "1" })
    ).toBe(false);
  });

  it("falls back to the charges flag when settings don't carry one", () => {
    expect(isCodAllowed({ sub_total: 0, is_cod_allowed: "1" }, undefined)).toBe(true);
  });
});

describe("walletTopUpShortfall", () => {
  // Trap 14: rounding down leaves the wallet short of what the pill promised.
  it("rounds the shortfall up to a whole unit", () => {
    expect(walletTopUpShortfall(100.2, 40)).toBe(61);
    expect(walletTopUpShortfall(100, 40)).toBe(60);
  });

  it("is null when the wallet already covers the order", () => {
    expect(walletTopUpShortfall(40, 40)).toBeNull();
    expect(walletTopUpShortfall(10, 40)).toBeNull();
  });
});

describe("walletCoversOrder", () => {
  it("covers an equal balance but never a zero total", () => {
    expect(walletCoversOrder(50, 50)).toBe(true);
    expect(walletCoversOrder(50, 49.99)).toBe(false);
    expect(walletCoversOrder(0, 50)).toBe(false);
  });
});

describe("swapQuantity", () => {
  it("carries the dead row's quantity over to a new line", () => {
    expect(swapQuantity({ requestedQty: 1, deadRowQty: 2, alreadyInCart: false })).toBe(2);
  });

  it("leaves an existing line's quantity alone", () => {
    expect(swapQuantity({ requestedQty: 1, deadRowQty: 2, alreadyInCart: true })).toBe(1);
  });

  it("respects an explicit quantity from a stepper", () => {
    expect(swapQuantity({ requestedQty: 3, deadRowQty: 2, alreadyInCart: false })).toBe(3);
  });
});

describe("isVariantBuyable", () => {
  // §5.1: unlimited products ship stock: 0, so stock alone is never the answer.
  it("buys an unlimited variant with no stock", () => {
    expect(isVariantBuyable({ stock: 0, isUnlimitedStock: "1" })).toBe(true);
  });

  it("refuses a switched-off variant whatever its stock", () => {
    expect(isVariantBuyable({ status: "0", stock: 99, isUnlimitedStock: "1" })).toBe(false);
  });

  it("needs stock when the product is limited", () => {
    expect(isVariantBuyable({ stock: 0, isUnlimitedStock: "0" })).toBe(false);
    expect(isVariantBuyable({ stock: 2, isUnlimitedStock: "0" })).toBe(true);
    expect(isVariantBuyable({ stock: 0, isUnlimitedStock: 0 })).toBe(false);
  });

  // The flag's shape varies by endpoint, and the rest of the app reads a
  // missing flag as unlimited — a stricter test would block adds the product
  // cards allow.
  it("reads `true` and a missing flag as unlimited", () => {
    expect(isVariantBuyable({ stock: 0, isUnlimitedStock: true })).toBe(true);
    expect(isVariantBuyable({ stock: 0, isUnlimitedStock: 1 })).toBe(true);
    expect(isVariantBuyable({ stock: 0 })).toBe(true);
  });
});

describe("buyableFirst", () => {
  it("puts buyable variants first and keeps API order inside each group", () => {
    const variants = [
      { id: "a", stock: 0, is_unlimited_stock: "0" },
      { id: "b", stock: 5, is_unlimited_stock: "0" },
      { id: "c", stock: 0, is_unlimited_stock: "1" },
      { id: "d", status: "0", stock: 9, is_unlimited_stock: "1" },
    ];
    expect(buyableFirst(variants).map((v) => v.id)).toEqual(["b", "c", "a", "d"]);
  });
});
