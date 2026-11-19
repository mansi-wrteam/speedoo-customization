import React from "react";
import { BiMinus, BiPlus } from "react-icons/bi";
import { t } from "@/utils/translation";

type CardClickHandler = (e: React.MouseEvent<HTMLButtonElement>) => void;

export interface ProductCartControlProps {
  /** The product (or its only variant) is already in the cart → show the stepper. */
  isAdded?: boolean;
  quantity?: number;
  variantCount?: number;
  onIncrease?: CardClickHandler;
  onDecrease?: CardClickHandler;
  onAdd?: CardClickHandler;
  onShowVariants?: CardClickHandler;
  iconSize?: number;
  showOptionsButton?: boolean;
  /** A tap is waiting on the network (past the spinner delay): swap + for a spinner. */
  busy?: boolean;
  /** Warm-up on press-down — fires ~100ms before the click lands. */
  onPrefetch?: () => void;
}

// Same footprint as the + icon, so the button never changes size.
const Spinner = ({ size }: { size: number }) => (
  <span
    className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
    style={{ width: size, height: size }}
    aria-hidden="true"
  />
);

/**
 * Shared add-to-cart / quantity-stepper / "N options" control used by every
 * product card. Presentational only — all cart logic stays in the parent.
 */
const ProductCartControl = ({
  isAdded,
  quantity,
  variantCount = 0,
  onIncrease,
  onDecrease,
  onAdd,
  onShowVariants,
  iconSize = 14,
  // Food delivery drops the "N options" entry point once the product is in the
  // cart, so the card can show a stepper instead; every + there re-opens the
  // customise/repeat sheet. Before anything is added it behaves as usual.
  showOptionsButton = true,
  busy = false,
  onPrefetch,
}: ProductCartControlProps) => {
  // Multi-variant products always keep the "N options" entry point on the
  // card — quantity for a specific variant is only ever adjusted inside the
  // variants modal (each variant row has its own -/+ there). The card can't
  // represent "added" unambiguously once more than one variant could be in
  // the cart, so it never switches to a stepper here, no matter what's added.
  if (showOptionsButton && variantCount > 1) {
    return (
      <button
        type="button"
        className="w-14 flex flex-col rounded-lg border border-[var(--brand-border-default)] overflow-hidden"
        onClick={onShowVariants}
        onPointerDown={onPrefetch}
        aria-label={t("add")}
        aria-busy={busy}
      >
        <span className="self-stretch py-0.5 bg-[var(--brand-background-subtle)] flex justify-center items-center text-[var(--brand-background-default)]">
          {busy ? <Spinner size={iconSize} /> : <BiPlus size={iconSize} />}
        </span>
        <span className="self-stretch px-1 py-1 bg-[var(--brand-foreground-inverse)] flex justify-center items-center text-[var(--brand-background-default)] text-[11px] font-semibold leading-none text-nowrap">
          {variantCount} {t("options")}
        </span>
      </button>
    );
  }

  if (isAdded) {
    return (
      <div className="flex items-center gap-2 bg-[var(--brand-background-default)] rounded-lg px-2 py-1.5">
        <button
          type="button"
          className="flex items-center justify-center text-[var(--foreground-inverse)]"
          onClick={onDecrease}
          aria-label="decrease"
        >
          <BiMinus size={iconSize} />
        </button>
        <span className="min-w-4 text-center text-[var(--foreground-inverse)] text-base font-bold leading-none">
          {quantity}
        </span>
        <button
          type="button"
          className="flex items-center justify-center text-[var(--foreground-inverse)]"
          onClick={onIncrease}
          onPointerDown={onPrefetch}
          aria-label="increase"
          aria-busy={busy}
        >
          {busy ? <Spinner size={iconSize} /> : <BiPlus size={iconSize} />}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="size-8 shrink-0 bg-[var(--brand-foreground-inverse)] rounded-lg outline outline-1 -outline-offset-1 outline-[var(--brand-border-default)] flex justify-center items-center hover:bg-[var(--brand-background-subtle)] transition"
      onClick={onAdd}
      onPointerDown={onPrefetch}
      aria-label={t("add")}
      aria-busy={busy}
    >
      <span className="flex text-[var(--brand-background-default)]">
        {busy ? <Spinner size={iconSize} /> : <BiPlus size={iconSize} />}
      </span>
    </button>
  );
};

export default ProductCartControl;
