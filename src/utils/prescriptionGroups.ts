// Helpers for the cart prescription-grouping feature.
// A "prescription group" binds a set of selected cart lines (identified by
// product_variant_id) to one or more prescription images.
//
// Note: all prescription tags use the brand token (var(--brand-background-default))
// — there is no per-group colour.
import type { Flag, Id } from "@/types/common";
import type { PrescriptionGroup } from "@/types/models/checkout";

type Maybe<T> = T | null | undefined;
type PrescriptionLine = { require_prescription?: Flag; product_variant_id?: Id };

// The group a given cart line (variant) belongs to, plus its index (for the
// group number label).
export const findGroupForVariant = (groups: Maybe<PrescriptionGroup[]>, variantId: Id): { group: PrescriptionGroup; index: number } | null => {
  if (!Array.isArray(groups)) return null;
  const index = groups.findIndex((g) => g?.productIds?.includes(variantId));
  return index === -1 ? null : { group: groups[index], index };
};

// Whether the prescription selection/grouping UI should be shown at all.
export const isPrescriptionContext = (cartProductsData: Maybe<PrescriptionLine[]>, activeModuleId: Maybe<Id>) =>
  activeModuleId == 2 ||
  (cartProductsData || []).some((p) => p?.require_prescription == 1);

// Variant ids of products that require a prescription but are not yet in a group.
export const getUncoveredRequiredVariantIds = (cartProductsData: Maybe<PrescriptionLine[]>, groups: Maybe<PrescriptionGroup[]>) => {
  const required = (cartProductsData || [])
    .filter((p) => p?.require_prescription == 1)
    .map((p) => p?.product_variant_id);
  const covered = new Set(
    (groups || []).flatMap((g) => g?.productIds || [])
  );
  return required.filter((id) => !covered.has(id as Id));
};
