import React from "react";
import { useSelector } from "react-redux";
import { FaMinus, FaPlus } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import { IoHeart } from "react-icons/io5";
import { RiCloseFill } from "react-icons/ri";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { t } from "@/utils/translation";
import { formatAmount } from "@/lib/utils";
import { getAddonName, getCartLineUnitPrice } from "@/utils/addonUtils";
import { getVariantPillLabels, hasOtherVariants } from "@/utils/cartRowUtils";
import { useCartRowQuantity } from "@/utils/useCartRowQuantity";
import type { ApiCartItem } from "@/types/models";
import type { RootState } from "@/types/state";

export interface CheckoutItemRowProps {
  row: ApiCartItem;
  /** Already in the customer's wishlist — shows the heart badge instead of the link. */
  isFavorite: boolean;
  /** `other_variants_count > 0`: opens the Choose Variant swap modal for this row. */
  onEditVariant: (row: ApiCartItem) => void;
  onMoveToFavorites: (row: ApiCartItem) => void;
  onUnfavorite: (row: ApiCartItem) => void;
  onRemove: (row: ApiCartItem) => void;
  onOpenProduct: (row: ApiCartItem) => void;
  /**
   * Pharmacy context (module 2, or any row that requires a prescription). The
   * chip reads "Optional" for `require_prescription: 0`, which is meaningful in
   * a pharmacy and noise everywhere else — so the parent decides.
   */
  showRxChip?: boolean;
  busy?: boolean;
}

/**
 * One live cart row in the drawer (WEB_PARITY_V4.0.2 §1.6).
 *
 * The size pill is the new part: with other variants to choose from it is
 * brand-tinted, carries a pencil and swaps the row; with none it is a plain
 * grey label and does nothing.
 */
const CheckoutItemRow = ({
  row,
  isFavorite,
  onEditVariant,
  onMoveToFavorites,
  onUnfavorite,
  onRemove,
  onOpenProduct,
  showRxChip = false,
  busy = false,
}: CheckoutItemRowProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const { qty, increase, decrease } = useCartRowQuantity(row);

  const pills = getVariantPillLabels(row);
  const editable = hasOtherVariants(row);
  // Per unit: (discounted_price || price) + addon_price. A row printing the
  // bare product price would not add up to the bill.
  const unitPrice = getCartLineUnitPrice(row);
  const lineTotal = unitPrice * (qty || 0);
  const mrpTotal = Number(row?.price ?? 0) * (qty || 0);
  // A real discount only: the API sometimes echoes discounted_price == price,
  // and striking through an identical number reads as a bug.
  const discounted =
    Number(row?.discounted_price) > 0 &&
    Number(row?.discounted_price) < Number(row?.price ?? 0);
  const addonNames = (row?.selected_addons || []).map(getAddonName).filter(Boolean);
  const name = row?.product?.translations?.name || row?.name || "";
  const currency = setting?.currency ?? "";
  const decimals = setting?.decimal_point;

  return (
    <div className="flex gap-3.5 border-b border-[var(--border-subtle)] py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => onOpenProduct(row)}
        className="relative flex-shrink-0"
        aria-label={name}
      >
        <div className="h-[60px] w-[60px] overflow-hidden rounded-lg bg-[var(--surface-subtle)] p-1">
          <ImageWithPlaceholder
            src={row?.image_url}
            alt={name}
            width={160}
            height={160}
            className="h-full w-full object-cover"
          />
        </div>
        {/* Overhangs the tile by 4px on both axes, as the design has it. */}
        {isFavorite && (
          <span
            role="button"
            tabIndex={0}
            aria-label={t("removeTowishlist")}
            onClick={(event) => {
              event.stopPropagation();
              onUnfavorite(row);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.stopPropagation();
                onUnfavorite(row);
              }
            }}
            className="absolute -left-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--surface-default)] text-[var(--status-error-default)] shadow"
          >
            <IoHeart size={13} />
          </span>
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpenProduct(row)}
            className="line-clamp-2 text-left text-[13.5px] font-bold leading-snug text-[var(--foreground-primary)]"
          >
            {name}
          </button>
          <button
            type="button"
            onClick={() => onRemove(row)}
            disabled={busy}
            aria-label={t("remove")}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[var(--foreground-tertiary)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--status-error-default)] disabled:opacity-60"
          >
            <RiCloseFill size={14} />
          </button>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {pills.map((label, index) =>
            editable && index === 0 ? (
              <button
                key={`${label}-${index}`}
                type="button"
                onClick={() => onEditVariant(row)}
                className="flex items-center gap-1 rounded bg-[var(--brand-background-subtle)] px-1.5 py-0.5 text-[11.5px] font-bold text-[var(--brand-foreground-default)]"
              >
                <GoPencil size={10} />
                {label}
              </button>
            ) : (
              <span
                key={`${label}-${index}`}
                className="text-xs text-[var(--foreground-tertiary)]"
              >
                {label}
              </span>
            )
          )}
        </div>

        {addonNames.length > 0 && (
          <span className="mt-1 inline-block max-w-full rounded bg-[var(--surface-subtle)] px-2 py-0.5 text-[11.5px] leading-snug text-[var(--foreground-tertiary)] line-clamp-2">
            {addonNames.join(", ")}
          </span>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {showRxChip && (
            <span className="inline-flex items-center rounded bg-[var(--status-warning-background)] px-2 py-0.5 text-[10.5px] font-extrabold uppercase text-[var(--status-warning-foreground)]">
              {`Rx ${String(row?.require_prescription) === "1" ? t("required") : t("optional")}`}
            </span>
          )}
          {!isFavorite && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onMoveToFavorites(row)}
              className="text-[11.5px] font-bold text-[var(--button-link-foreground-default)] underline decoration-dotted underline-offset-2 disabled:opacity-60"
            >
              {t("move_to_favorites")}
            </button>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-default)]">
            <button
              type="button"
              onClick={decrease}
              disabled={busy}
              aria-label={t("remove")}
              className="flex h-[26px] w-[26px] items-center justify-center bg-[var(--brand-background-default)] text-[var(--foreground-inverse)] transition-colors hover:bg-[var(--brand-background-hover)] disabled:opacity-60"
            >
              <FaMinus size={9} />
            </button>
            <span className="w-7 text-center text-[13px] font-bold text-[var(--foreground-primary)]">
              {qty}
            </span>
            <button
              type="button"
              onClick={increase}
              disabled={busy}
              aria-label={t("add")}
              className="flex h-[26px] w-[26px] items-center justify-center bg-[var(--brand-background-default)] text-[var(--foreground-inverse)] transition-colors hover:bg-[var(--brand-background-hover)] disabled:opacity-60"
            >
              <FaPlus size={9} />
            </button>
          </div>
          <div className="text-right">
            <b className="text-[13.5px] font-extrabold text-[var(--foreground-primary)]">
              {currency}
              {formatAmount(lineTotal, decimals)}
            </b>
            {discounted && (
              <s className="ml-1.5 text-[11.5px] text-[var(--foreground-tertiary)]">
                {currency}
                {formatAmount(mrpTotal, decimals)}
              </s>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutItemRow;
