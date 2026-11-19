// Guest cart line identity.
//
// The guest cart is device-local, and every module except Food Delivery keeps
// exactly one line per variant — so a line is addressed by its variant, as it
// always has been. Add-ons break that: the same variant can sit in the cart
// several times with different add-ons, so those lines carry a locally minted
// `guest_line_id` and are addressed by it instead.
//
// Every helper here falls back to variant matching when a line has no id, which
// is what keeps grocery/pharmacy/ecommerce guest carts behaving exactly as
// before.
import type { Id } from "@/types/common";

type Maybe<T> = T | null | undefined;
/** The fields these helpers read from a guest line or a rendered cart row. */
export type GuestLineLike = {
  guest_line_id?: Maybe<string>;
  product_variant_id?: Id;
  selected_addon_ids?: Maybe<Id[]>;
  qty?: number;
  addon_price?: unknown;
  selected_addons?: unknown;
};
export type ExpandedGuestRow<R> = R & Pick<GuestLineLike, "qty" | "guest_line_id" | "selected_addons" | "addon_price">;

export const newGuestLineId = (): string =>
  `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const getAddonIds = (line: Maybe<{ selected_addon_ids?: Maybe<Id[]> }>): string[] =>
  (line?.selected_addon_ids || []).map(String).sort();

export const sameAddonSet = (a: Maybe<Id[]>, b: Maybe<Id[]>) => {
  const x = getAddonIds({ selected_addon_ids: a });
  const y = getAddonIds({ selected_addon_ids: b });
  return x.length === y.length && x.every((value, i) => value === y[i]);
};

// True once any line in this module's guest cart carries add-ons. Guards every
// add-on-specific branch so carts without add-ons take the original path.
export const hasGuestAddons = (lines: Maybe<GuestLineLike[]> = []) =>
  (lines || []).some((line) => (line?.selected_addon_ids?.length || 0) > 0);

// Matches a rendered row back to its guest line.
export const findGuestLine = <T extends GuestLineLike>(lines: Maybe<T[]> = [], row: Maybe<GuestLineLike>) =>
  row?.guest_line_id != null
    ? (lines || []).find((line) => line?.guest_line_id === row?.guest_line_id)
    : (lines || []).find(
        (line) => line?.product_variant_id == row?.product_variant_id
      );

export const isSameGuestLine = (line: Maybe<GuestLineLike>, row: Maybe<GuestLineLike>) =>
  row?.guest_line_id != null
    ? line?.guest_line_id === row?.guest_line_id
    : line?.product_variant_id == row?.product_variant_id;

// `guest_cart` dedupes by variant — two lines of one variant come back as a
// single row (and its qty is only the first line's). So each local line is
// re-paired with its variant's row and given back its own qty and add-ons.
export const expandGuestRows = <R extends { product_variant_id?: Id; selected_addons?: unknown; addon_price?: unknown }>(rows: Maybe<R[]> = [], lines: Maybe<GuestLineLike[]> = []) =>
  (lines || [])
    .map((line) => {
      const row = (rows || []).find(
        (item) => item?.product_variant_id == line?.product_variant_id
      );
      if (!row) return null;
      return {
        ...row,
        qty: line?.qty,
        guest_line_id: line?.guest_line_id,
        selected_addons: line?.selected_addons ?? row?.selected_addons,
        addon_price: line?.addon_price ?? row?.addon_price,
      };
    })
    .filter(Boolean) as ExpandedGuestRow<R>[];

// `guest_cart` prices variants only, so the add-on side of the subtotal is
// summed locally.
export const guestAddonsTotal = (lines: Maybe<GuestLineLike[]> = []) =>
  (lines || []).reduce(
    (sum, line) =>
      sum + (Number(line?.addon_price) || 0) * (Number(line?.qty) || 0),
    0
  );
