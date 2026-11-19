import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { togglePrescriptionSelection } from "@/redux/slices/checkoutSlice";
import { findGroupForVariant } from "@/utils/prescriptionGroups";
import { t } from "@/utils/translation";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { ApiCartItem } from "@/types/models";

export interface PrescriptionSelectCheckboxProps {
  /** Cart line (only `product_variant_id` is read). */
  product: Pick<ApiCartItem, "product_variant_id">;
  /** Show the "select for prescription" hint next to an ungrouped checkbox. */
  showNote?: boolean;
}

// Per-card selection checkbox for prescription grouping. Renders ONLY the
// checkbox (with an optional hint note); the colored status badge is a separate
// component (PrescriptionStatusBadge) so each card can place it cleanly near the
// product name. Once the line is in a group the checkbox shows checked + locked.
const PrescriptionSelectCheckbox = ({ product, showNote = false }: PrescriptionSelectCheckboxProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const groups = useSelector((state: RootState) => state.Checkout.prescriptionGroups);
  const selected = useSelector(
    (state: RootState) => state.Checkout.selectedPrescriptionProductIds
  );

  // Selecting/grouping is a logged-in-only action (guests can't upload images),
  // so don't show the checkbox for guests — they get a "login to upload" prompt
  // in the prescription panel instead.
  const isLoggedIn = useSelector((state: RootState) => !!state.User?.jwtToken);

  const variantId = product?.product_variant_id;
  const grouped = findGroupForVariant(groups, variantId);
  const isChecked = grouped ? true : selected?.includes(variantId);

  if (!isLoggedIn) return null;

  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        className="h-4 w-4 flex-shrink-0 cursor-pointer accent-[var(--brand-background-default)] disabled:cursor-not-allowed"
        checked={!!isChecked}
        disabled={!!grouped}
        onChange={() =>
          dispatch(togglePrescriptionSelection({ productId: variantId }))
        }
      />
      {showNote && !grouped && (
        <span className="text-[11px] text-[var(--foreground-tertiary)] leading-tight">
          {t("select_for_prescription")}
        </span>
      )}
    </label>
  );
};

export default PrescriptionSelectCheckbox;
