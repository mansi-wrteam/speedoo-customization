import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import * as api from "@/api/apiRoutes";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import Loader from "@/components/loader/Loader";
import { t } from "@/utils/translation";
import { formatAmount } from "@/lib/utils";
import { buyableFirst, isVariantBuyable } from "@/utils/cartRowUtils";
import { getProductImage, getVariantImage, getVariantLabel } from "@/utils/variantUtils";
import { useCartLineSwap } from "@/utils/useCartLineSwap";
import type { ApiCartItem, Product, ProductVariant } from "@/types/models";
import type { RootState } from "@/types/state";

export interface ReplaceItemModalProps {
  /** The dead row being replaced; null closes the sheet. */
  row: ApiCartItem | null;
  onClose: () => void;
  /** Re-read the cart once the swap lands. */
  onSwapped: () => void | Promise<void>;
}

interface CandidateRowProps {
  image?: string | null;
  name?: string | null;
  label?: string | null;
  price?: number;
  strikePrice?: number;
  disabled?: boolean;
  busy?: boolean;
  onAdd: () => void;
}

const CandidateRow = ({
  image,
  name,
  label,
  price,
  strikePrice,
  disabled,
  busy,
  onAdd,
}: CandidateRowProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--surface-subtle)] p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
        <ImageWithPlaceholder
          src={image}
          alt={name ?? ""}
          width={120}
          height={120}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold leading-5 text-[var(--foreground-primary)]">
          {name}
        </p>
        {label && (
          <p className="truncate text-xs font-normal leading-4 text-[var(--foreground-tertiary)]">
            {label}
          </p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold leading-5 text-[var(--foreground-primary)]">
            {setting?.currency}
            {formatAmount(price, setting?.decimal_point)}
          </span>
          {strikePrice != null && strikePrice > (price ?? 0) && (
            <span className="text-xs font-normal leading-4 text-[var(--foreground-tertiary)] line-through">
              {setting?.currency}
              {formatAmount(strikePrice, setting?.decimal_point)}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled || busy}
        className="flex-shrink-0 rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2 text-sm font-medium leading-5 text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:cursor-not-allowed disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-foreground-disabled)]"
      >
        {disabled ? t("out_of_stock") : t("add")}
      </button>
    </div>
  );
};

/**
 * Replace Item (WEB_PARITY_V4.0.2 §1.5).
 *
 * Two lists: the dead line's other variants, then products from the same
 * category. The category list comes from `products` + `category_ids` — NOT
 * `products/similar`, which returns raw database rows with no
 * `total_allowed_quantity` (so every add is refused) and `image` instead of
 * `image_url` (trap 10).
 */
const ReplaceItemModal = ({ row, onClose, onSwapped }: ReplaceItemModalProps) => {
  const city = useSelector((state: RootState) => state.City.city);
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const { swapping, swapTo } = useCartLineSwap({ deadRow: row, onSwapped });

  useEffect(() => {
    if (!row) {
      setProduct(null);
      setSimilar([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // Latitude/longitude are required — the server rejects a blank latitude
        // (v4.0.1 trap 1).
        const response = await api.getProductById({
          latitude: city?.latitude,
          longitude: city?.longitude,
          id: row?.product_id,
        });
        if (cancelled) return;
        const loaded = Array.isArray(response?.data) ? response?.data?.[0] : response?.data;
        setProduct((loaded as Product) ?? null);

        const categoryId = (loaded as Product)?.category_id ?? row?.category_id;
        if (categoryId != null) {
          const list = await api.getProductByFilter({
            latitude: city?.latitude,
            longitude: city?.longitude,
            filters: { category_ids: categoryId, limit: 10 },
          });
          if (cancelled) return;
          // Drop the dead product itself — offering it back is no replacement.
          setSimilar(
            (list?.data || []).filter((item) => item?.id != row?.product_id)
          );
        } else {
          setSimilar([]);
        }
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

  /** Every variant of the dead product except the one that is in the cart, buyable first. */
  const otherVariants = useMemo(() => {
    const variants = (product?.variants || []).filter(
      (variant) => variant?.id != row?.product_variant_id
    );
    return buyableFirst(variants, product?.is_unlimited_stock);
  }, [product, row?.product_variant_id]);

  const addVariant = async (variant: ProductVariant, owner: Product) => {
    const done = await swapTo({ product: owner, variant });
    if (done) onClose();
  };

  /** A listed product adds its first buyable variant — the same default its own page would pick (§5.2). */
  const addProduct = async (candidate: Product) => {
    const variant = buyableFirst(candidate?.variants, candidate?.is_unlimited_stock)[0];
    if (!variant) return;
    await addVariant(variant, candidate);
  };

  return (
    <Dialog open={Boolean(row)}>
      <DialogContent className="flex w-[520px] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
          <DialogTitle className="text-[19px] font-extrabold text-[var(--foreground-primary)]">
            {t("replace_item")}
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
            <div className="flex flex-col gap-6">
              {otherVariants.length > 0 && (
                <div className="flex flex-col">
                  <h3 className="pb-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                    {t("other_variants")}
                  </h3>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {otherVariants.map((variant) => {
                      const buyable = isVariantBuyable({
                        status: variant?.status,
                        stock: variant?.stock,
                        isUnlimitedStock:
                          variant?.is_unlimited_stock ?? product?.is_unlimited_stock,
                      });
                      return (
                        <CandidateRow
                          key={variant?.id}
                          image={
                            getVariantImage(variant, product?.image_url) ||
                            getProductImage(product)
                          }
                          name={product?.translations?.name}
                          label={getVariantLabel(variant)}
                          price={
                            Number(variant?.discounted_price) > 0
                              ? Number(variant?.discounted_price)
                              : Number(variant?.price)
                          }
                          strikePrice={
                            Number(variant?.discounted_price) > 0
                              ? Number(variant?.price)
                              : undefined
                          }
                          disabled={!buyable}
                          busy={swapping}
                          onAdd={() => product && addVariant(variant, product)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {similar.length > 0 && (
                <div className="flex flex-col">
                  <h3 className="pb-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                    {t("or_select_from_below")}
                  </h3>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {similar.map((candidate) => {
                      const variant = buyableFirst(
                        candidate?.variants,
                        candidate?.is_unlimited_stock
                      )[0];
                      const buyable = Boolean(
                        variant &&
                          isVariantBuyable({
                            status: variant?.status,
                            stock: variant?.stock,
                            isUnlimitedStock:
                              variant?.is_unlimited_stock ?? candidate?.is_unlimited_stock,
                          })
                      );
                      return (
                        <CandidateRow
                          key={candidate?.id}
                          image={getProductImage(candidate)}
                          name={candidate?.translations?.name}
                          label={variant ? getVariantLabel(variant) : null}
                          price={
                            Number(variant?.discounted_price) > 0
                              ? Number(variant?.discounted_price)
                              : Number(variant?.price)
                          }
                          strikePrice={
                            Number(variant?.discounted_price) > 0
                              ? Number(variant?.price)
                              : undefined
                          }
                          disabled={!buyable}
                          busy={swapping}
                          onAdd={() => addProduct(candidate)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {otherVariants.length === 0 && similar.length === 0 && (
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

export default ReplaceItemModal;
