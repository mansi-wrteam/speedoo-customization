import { describe, expect, it } from "vitest";
import { formatAddressLine } from "./CheckoutAddressHeader";
import type { Address } from "@/types/models";

const address = (fields: Partial<Address>) => ({ id: 1, ...fields }) as Address;

describe("formatAddressLine", () => {
  it("joins the parts of a plainly typed address", () => {
    expect(
      formatAddressLine(
        address({ address: "12 MG Road", area: "Uma Nagar", city: "Bhuj", pincode: "370001" })
      )
    ).toBe("12 MG Road, Uma Nagar, Bhuj, 370001");
  });

  // A pin dropped on the map writes the whole geocoded address into `address`,
  // and area/city/pincode then repeat pieces of it.
  it("drops parts the line already contains", () => {
    expect(
      formatAddressLine(
        address({
          address: "47, Mirzapar Hwy, Uma Nagar, Bhuj, Gujarat 370040, India",
          area: "Mirzapar Highway",
          city: "Bhuj",
          pincode: "370040",
        })
      )
    ).toBe("47, Mirzapar Hwy, Uma Nagar, Bhuj, Gujarat 370040, India, Mirzapar Highway");
  });

  it("ignores case and padding when deciding what repeats", () => {
    expect(
      formatAddressLine(address({ address: "12 MG Road, BHUJ", city: "  bhuj  " }))
    ).toBe("12 MG Road, BHUJ");
  });

  it("skips blanks and survives a missing address", () => {
    expect(formatAddressLine(address({ address: "12 MG Road", area: "", city: "Bhuj" }))).toBe(
      "12 MG Road, Bhuj"
    );
    expect(formatAddressLine(null)).toBe("");
  });
});
