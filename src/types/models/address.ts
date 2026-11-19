// Saved delivery address — items of `api.getAddress()` `data`, stored in Redux
// `Addresses.allAddresses` / `selectedEditAddress` and `Checkout.address`.

import type { Flag, Id, Numeric } from "../common";

/** Values the address form (NewAddressModal) offers for `type`. */
export type AddressType = "Home" | "Office" | "Other";

export interface Address {
  id: Id;
  /** Recipient name. */
  name?: string;
  mobile?: string;
  alternate_mobile?: string;
  /** Usually an `AddressType`; kept as `string` because the API echoes whatever was saved. */
  type?: string;
  /** Street / house line. */
  address?: string;
  landmark?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  /** Compared with `=== 1` (AddressCard, NewAddressModal) and `== 1` (Checkout). */
  is_default?: Flag;
  latitude?: Numeric;
  longitude?: Numeric;
}
