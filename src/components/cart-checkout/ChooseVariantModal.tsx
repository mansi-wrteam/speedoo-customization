import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import Loader from "@/components/loader/Loader";
import { t } from "@/utils/translation";
import { formatAmount } from "@/lib/utils";
import { buyableFirst, isVariantBuyable } from "@/utils/cartRowUtils";
import { getProductImage, getVariantImage, getVariantLabel } from "@/utils/variantUtils";
import { useCartLineSwap } from "@/utils/useCartLineSwap";
import { fetchProductDetail, peekProductDetail } from "@/utils/productDetailCache";
import type { ApiCartItem, Product, ProductVariant } from "@/types/models";
import type { RootState } from "@/types/state";

export interface ChooseVariantModalProps {
  /** The live row whose size pill was tapped; null closes the sheet. */
  row: ApiCartItem | null;
  onClose: () => void;
  onSwapped: () => void | Promise<void>;
}

/**
 * Choose Variant (WEB_PARITY_V4.0.2 §1.6).
 *
 * Opened from an editable size pill. It runs the same swap rule as Replace:
 * the new variant takes the old row's quantity, and the old row only goes once
 * the add has succeeded.
 */
const ChooseVariantModal = ({ row, onClose, onSwapped }: ChooseVariantModalProps) => {
  const city = useSelector((state: RootState) => state.City.city);
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  // The variant just tapped. Shown as selected right away so the tap answers
  // instantly; cleared (back to the row's real variant) if the swap fails.
  const [pendingId, setPendingId] = useState<ProductVariant["id"] | null>(null);

  const { swapping, swapTo } = useCartLineSwap({ deadRow: row, onSwapped });

  useEffect(() => {
    setPendingId(null);
    if (!row) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    const params = {
      latitude: city?.latitude,
      longitude: city?.longitude,
      id: row?.product_id,
    };

    // Reopening (or a product the cards prefetched) skips the loader.
    const cached = peekProductDetail(params);
    if (cached) {
      setProduct(cached);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const loaded = await fetchProductDetail(params);
        if (cancelled) return;
        setProduct(loaded);
      } catch (error) {
        console.log("Error", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [row?.product_id, row?.cart_id, city?.latitude, city?.longitude]);

  /** In-stock first, API order kept inside each group (§5.2). */
  const variants = useMemo(
    () => buyableFirst(product?.variants, product?.is_unlimited_stock),
    [product]
  );

  const pick = async (variant: ProductVariant) => {
    if (!product || swapping) return;
    // Already the row's variant: nothing to swap.
    if (variant?.id == row?.product_variant_id) {
      onClose();
      return;
    }
    setPendingId(variant?.id);
    const done = await swapTo({ product, variant });
    if (done) onClose();
    else setPendingId(null);
  };

  const selectedId = pendingId ?? row?.product_variant_id;

  return (
    <Dialog open={Boolean(row)}>
      <DialogContent className="flex w-[480px] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
          <DialogTitle className="text-[19px] font-extrabold text-[var(--foreground-primary)]">
            {t("choose_variant")}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--foreground-secondary)]"
          >
            <RiCloseFill size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {variants.map((variant) => {
                const selected = variant?.id == selectedId;
                const isPending = swapping && variant?.id == pendingId;
                const buyable = isVariantBuyable({
                  status: variant?.status,
                  stock: variant?.stock,
                  isUnlimitedStock:
                    variant?.is_unlimited_stock ?? product?.is_unlimited_stock,
                });
                const price =
                  Number(variant?.discounted_price) > 0
                    ? Number(variant?.discounted_price)
                    : Number(variant?.price);
                return (
                  <button
                    key={variant?.id}
                    type="button"
                    onClick={() => pick(variant)}
                    disabled={!buyable}
                    aria-busy={isPending}
                    className={`flex w-full items-center gap-3 py-3 text-left transition-opacity disabled:cursor-not-allowed ${
                      buyable ? "" : "opacity-60"
                    } ${
                      // While a swap runs the other rows step back, but no
                      // "not-allowed" cursor — nothing is wrong, it's working.
                      swapping && !isPending ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--surface-subtle)] p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                      <ImageWithPlaceholder
                        src={
                          getVariantImage(variant, product?.image_url) ||
                          getProductImage(product)
                        }
                        alt={getVariantLabel(variant)}
                        width={120}
                        height={120}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold leading-5 text-[var(--foreground-primary)]">
                        {getVariantLabel(variant)}
                      </span>
                      <span className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                        {setting?.currency}
                        {formatAmount(price, setting?.decimal_point)}
                        {!buyable ? ` · ${t("out_of_stock")}` : ""}
                      </span>
                    </div>
                    {isPending ? (
                      <span
                        className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-[var(--brand-foreground-default)] border-t-transparent"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                          selected
                            ? "border-[var(--brand-foreground-default)] bg-[var(--brand-foreground-default)]"
                            : "border-[var(--border-default)]"
                        }`}
                      >
                        {selected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-foreground-inverse)]" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
              {variants.length === 0 && (
                <p className="py-10 text-center text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                  {t("no_products_found")}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChooseVariantModal;
