import React from "react";
import { sortAttributeValues, getVariantLabel } from "@/utils/variantUtils";
import type { ProductVariant } from "@/types/models";

export interface VariantAttributeChipsProps {
  /** attribute_values based or legacy (measurement/unit) variant. */
  variant?: ProductVariant | null;
  size?: "sm" | "md";
}

/**
 * VariantAttributeChips — renders a variant's attribute values as chips.
 * Color-type values get a swatch dot; others plain text. Falls back to the
 * legacy measurement/unit label when the variant has no attribute_values.
 *
 * Props:
 *  - variant : variant object (attribute_values based or legacy)
 *  - size    : "sm" | "md" chip sizing (default "md")
 */
const VariantAttributeChips = ({ variant, size = "md" }: VariantAttributeChipsProps) => {
  const chipPadding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  if (!variant?.attribute_values?.length) {
    return (
      <span className="font-medium text-base text-[var(--foreground-primary)]">
        {getVariantLabel(variant)}
      </span>
    );
  }

  return (
    <>
      {sortAttributeValues(variant.attribute_values).map((attrValue) => (
        <span
          key={attrValue?.id}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] font-medium text-[var(--foreground-primary)] ${chipPadding}`}
        >
          {attrValue?.color_code ? (
            <span
              className="size-3.5 rounded-full border border-[var(--border-default)] shrink-0"
              style={{ backgroundColor: attrValue.color_code }}
            ></span>
          ) : null}
          {attrValue?.short_code
            ? `${attrValue.value} ${attrValue.short_code}`
            : attrValue?.value}
        </span>
      ))}
    </>
  );
};

export default VariantAttributeChips;
