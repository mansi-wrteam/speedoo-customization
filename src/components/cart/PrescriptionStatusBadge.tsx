import React from "react";
import { useSelector } from "react-redux";
import { findGroupForVariant } from "@/utils/prescriptionGroups";
import { t } from "@/utils/translation";
import type { RootState } from "@/types/state";
import type { ApiCartItem } from "@/types/models";

export interface PrescriptionStatusBadgeProps {
  /** Cart line (only `product_variant_id` and `require_prescription` are read). */
  product: Pick<ApiCartItem, "product_variant_id" | "require_prescription">;
  /** Extra classes appended to the pill. */
  className?: string;
}

// Small status pill for a cart line:
//  - grouped                       -> "Prescription added · Group N"
//  - needs prescription, ungrouped -> "Needs Prescription"
//  - otherwise           -> nothing
// All tags sit on the brand background token.
const PrescriptionStatusBadge = ({ product, className = "" }: PrescriptionStatusBadgeProps) => {
  const groups = useSelector((state: RootState) => state.Checkout.prescriptionGroups);
  const grouped = findGroupForVariant(groups, product?.product_variant_id);

  if (grouped) {
    return (
      <span
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[var(--brand-background-default)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand-foreground-inverse)] ${className}`}
      >
        {t("rx_added")} · {t("group")} {grouped.index + 1}
      </span>
    );
  }

  if (product?.require_prescription == 1) {
    return (
      <span
        className={`inline-block whitespace-nowrap rounded-full bg-[var(--brand-background-default)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand-foreground-inverse)] ${className}`}
      >
        {t("needs_rx")}
      </span>
    );
  }

  return null;
};

export default PrescriptionStatusBadge;
