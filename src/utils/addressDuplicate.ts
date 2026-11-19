// Spotting an address the customer already has (WEB_PARITY_V4.0.2 §7).
//
// Saving the same place twice is almost always a double tap, not a second
// address — so the match is on the street line AND the pincode, ignoring case
// and extra spaces, and excluding the address being edited.
import type { Address } from "@/types/models";

type Maybe<T> = T | null | undefined;

const normalise = (value: Maybe<string>) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export interface AddressLike {
  id?: Maybe<string | number>;
  address?: Maybe<string>;
  pincode?: Maybe<string>;
}

/**
 * The saved address this one duplicates, or null.
 *
 * `editingId` is the address being edited — it is not its own duplicate.
 */
export const findDuplicateAddress = (
  candidate: Maybe<AddressLike>,
  saved: Maybe<Address[]>,
  editingId?: Maybe<string | number>
): Address | null => {
  const street = normalise(candidate?.address);
  const pincode = normalise(candidate?.pincode);
  // Nothing to compare: an empty line matches everything, which is worse than
  // matching nothing.
  if (!street || !pincode) return null;

  return (
    (saved || []).find(
      (existing) =>
        (editingId == null || String(existing?.id) !== String(editingId)) &&
        normalise(existing?.address) === street &&
        normalise(existing?.pincode) === pincode
    ) ?? null
  );
};
