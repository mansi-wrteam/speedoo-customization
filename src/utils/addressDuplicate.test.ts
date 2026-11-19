import { describe, expect, it } from "vitest";
import { findDuplicateAddress } from "./addressDuplicate";
import type { Address } from "@/types/models";

const saved = [
  { id: 1, address: "12 MG Road", pincode: "370001" },
  { id: 2, address: "47 Mirzapar Hwy", pincode: "370040" },
] as Address[];

describe("findDuplicateAddress", () => {
  it("matches on the street line and the pincode together", () => {
    expect(findDuplicateAddress({ address: "12 MG Road", pincode: "370001" }, saved)?.id).toBe(1);
    // Same street, different pincode: a different place.
    expect(findDuplicateAddress({ address: "12 MG Road", pincode: "370002" }, saved)).toBeNull();
  });

  it("ignores case and repeated spaces", () => {
    expect(
      findDuplicateAddress({ address: "  12   mg ROAD ", pincode: " 370001 " }, saved)?.id
    ).toBe(1);
  });

  // Editing an address must not flag it as a duplicate of itself.
  it("excludes the address being edited", () => {
    expect(
      findDuplicateAddress({ id: 1, address: "12 MG Road", pincode: "370001" }, saved, 1)
    ).toBeNull();
  });

  it("stays quiet when there is nothing to compare", () => {
    expect(findDuplicateAddress({ address: "", pincode: "370001" }, saved)).toBeNull();
    expect(findDuplicateAddress({ address: "12 MG Road", pincode: "" }, saved)).toBeNull();
    expect(findDuplicateAddress(null, saved)).toBeNull();
  });
});
