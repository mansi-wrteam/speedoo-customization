import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogHeader, closeButtonClass } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { FiMinus, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import { t } from "@/utils/translation";
import { formatAmount, formatPriceDisplay, cn } from "@/lib/utils";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { KigenRadio } from "../common/KigenControls";
import AddonGroupsList from "./AddonGroupsList";
import { getVariantLabel, getVariantImage } from "@/utils/variantUtils";
import { getAddonGroups, getSelectedAddonsTotal } from "@/utils/addonUtils";
import { useAddonCartAdd, variantPrice } from "@/utils/useAddonCartAdd";
import type { AddonSelections, Product, ProductVariant } from "@/types/models";
import type { RootState } from "@/types/state";

export interface AddonCustomizationModalProps {
  /** Full product from `product_by_id` — the only payload carrying `addon_groups`. */
  product: Product | null;
  /** The caller's current variant; fallback when no active variant matches. */
  variant: ProductVariant | null | undefined;
  showAddonModal: boolean;
  setShowAddonModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const Login = dynamic(() => import("../login/Login"), { ssr: false });

// Keeps the inputs controlled; the surrounding row owns the toggle.
const noop = () => {};

// Customise sheet (WEB_PARITY_V4.0.1 §3.2) — food module only.
// Variant radios (selection only, nothing written until Add to Cart) plus the
// product's add-on groups, a quantity stepper and a running total.
const AddonCustomizationModal = ({
  product,
  variant,
  showAddonModal,
  setShowAddonModal,
}: AddonCustomizationModalProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);

  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(variant?.id);
  const [selections, setSelections] = useState<AddonSelections>({}); // { [groupId]: optionId[] }
  const [showLogin, setShowLogin] = useState(false);
  const { addWithAddons, submitting } = useAddonCartAdd();

  const groups = useMemo(() => getAddonGroups(product), [product]);
  const variants = useMemo(
    () => (product?.variants || []).filter((v) => Number(v?.status) === 1),
    [product]
  );

  const isVariantOutOfStock = (v: ProductVariant) =>
    Number(product?.is_unlimited_stock) === 0 && Number(v?.stock) <= 0;

  // First in-stock variant is preselected so the total is never blank (§3.2).
  const defaultVariantId = useMemo(() => {
    const inStock = variants.find((v) => !isVariantOutOfStock(v));
    return (inStock || variants[0])?.id ?? variant?.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants, variant?.id, product?.is_unlimited_stock]);

  useEffect(() => {
    if (showAddonModal) {
      setQty(1);
      setSelections({});
      setSelectedVariantId(defaultVariantId);
    }
  }, [showAddonModal, product, defaultVariantId]);

  const activeVariant = useMemo(
    () => variants.find((v) => v?.id === selectedVariantId) || variant,
    [variants, selectedVariantId, variant]
  );

  const variantIsDiscounted = (v: ProductVariant | null | undefined) =>
    Number(v?.discounted_price) > 0 && Number(v?.discounted_price) !== Number(v?.price);

  const addonsTotal = useMemo(
    () => getSelectedAddonsTotal(groups, selections),
    [groups, selections]
  );

  const totalPrice = (variantPrice(activeVariant) + addonsTotal) * qty;

  // Floors at 1 — there is an explicit Add button, so 0 would offer to add
  // nothing (§3.2).
  const handleQtyDecrease = () => setQty((q) => Math.max(1, q - 1));
  const handleQtyIncrease = () => {
    const maxAllowed = Number(product?.total_allowed_quantity) || Infinity;
    if (qty >= maxAllowed) {
      toast.error(t("max_cart_limit_error"));
      return;
    }
    if (
      Number(product?.is_unlimited_stock) === 0 &&
      qty >= Number(activeVariant?.stock)
    ) {
      toast.error(t("out_of_stock_message"));
      return;
    }
    setQty((q) => q + 1);
  };

  const handleClose = () => setShowAddonModal(false);

  const handleAddToCart = async () => {
    const added = await addWithAddons({
      product,
      variant: activeVariant,
      qty,
      groups,
      selections,
    });
    // Sheet stays open when the write is rejected (§3.2).
    if (added) handleClose();
  };

  return (
    <>
      <Dialog open={showAddonModal}>
        <DialogContent className="flex max-h-[70vh] w-full max-w-xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 flex flex-row items-center justify-between gap-4 border-b border-[var(--border-default)] px-4 py-2 text-start space-y-0">
            <span className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
              {t("customize_in_your_way")}
            </span>
            <button
              type="button"
              onClick={handleClose}
              aria-label={t("close")}
              className={cn(closeButtonClass, "cursor-pointer")}
            >
              <RiCloseFill />
            </button>
          </DialogHeader>

          <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
            <div className="p-4 bg-[var(--brand-background-subtle)] border-b border-[var(--border-subtle)] flex items-center gap-3">
              <div className="size-16 shrink-0 p-1 bg-[var(--surface-default)] rounded-lg outline outline-1 outline-[var(--border-subtle)] relative">
                <ImageWithPlaceholder
                  src={product?.image_url}
                  alt={product?.translations?.name}
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-base font-semibold leading-6 text-[var(--foreground-primary)] line-clamp-1">
                  {product?.translations?.name}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold leading-5 text-[var(--brand-foreground-default)]">
                    {setting?.currency}
                    {formatPriceDisplay(variantPrice(activeVariant))}
                  </span>
                  {variantIsDiscounted(activeVariant) ? (
                    <span className="text-sm font-medium leading-5 text-[var(--foreground-tertiary)] line-through">
                      {setting?.currency}
                      {formatPriceDisplay(activeVariant?.price)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {variants.length > 1 ? (
              <div className="p-4 flex flex-col gap-1">
                <div className="text-sm font-medium leading-5 text-[var(--foreground-primary)]">
                  {t("choose_variant")}
                </div>
                <div className="text-xs font-medium leading-4 text-[var(--foreground-tertiary)] mb-1">
                  {t("choose_the_option_that_fits_your_way")}
                </div>
                <div className="rounded-xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] overflow-hidden">
                  {variants.map((v, idx) => {
                    const checked = v?.id === selectedVariantId;
                    const outOfStock = isVariantOutOfStock(v);
                    return (
                      <div
                        key={v.id}
                        className={`p-3 flex items-center gap-2 ${
                          idx < variants.length - 1
                            ? "border-b border-[var(--border-subtle)]"
                            : ""
                        } ${checked ? "bg-[var(--surface-subtle)]" : ""} ${
                          outOfStock ? "opacity-60" : "cursor-pointer"
                        }`}
                        onClick={() => !outOfStock && setSelectedVariantId(v.id)}
                      >
                        <div className="size-10 shrink-0 relative rounded-lg overflow-hidden bg-[var(--surface-subtle)]">
                          <ImageWithPlaceholder
                            src={getVariantImage(v, product?.image_url) || product?.image_url}
                            alt={getVariantLabel(v)}
                            fill
                            sizes="40px"
                            className="object-contain"
                          />
                        </div>
                        <span className="flex-1 text-sm font-normal leading-5 text-[var(--foreground-secondary)] line-clamp-1">
                          {getVariantLabel(v)}
                        </span>
                        <span className="flex items-baseline gap-1">
                          <span className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">
                            {setting?.currency}
                            {formatPriceDisplay(variantPrice(v))}
                          </span>
                          {variantIsDiscounted(v) ? (
                            <span className="text-xs font-normal text-[var(--foreground-tertiary)] line-through">
                              {setting?.currency}
                              {formatPriceDisplay(v?.price)}
                            </span>
                          ) : null}
                        </span>
                        {outOfStock ? (
                          <span className="text-xs font-bold text-[var(--status-error-default)]">
                            {t("out_of_stock")}
                          </span>
                        ) : (
                          <KigenRadio checked={checked} onChange={noop} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <AddonGroupsList
              groups={groups}
              selections={selections}
              setSelections={setSelections}
            />
          </div>

          <div className="shrink-0 p-4 border-t border-[var(--border-subtle)] flex flex-col items-end gap-2.5">
            <div className="self-stretch flex items-center gap-4">
              <div className="w-36 shrink-0 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-default)] flex justify-between items-center">
                <button
                  type="button"
                  className="tap-target-y p-1.5 flex items-center justify-center text-[var(--brand-foreground-on-brand)]"
                  onClick={handleQtyDecrease}
                  aria-label={t("decrease_quantity")}
                >
                  <FiMinus size={20} />
                </button>
                <span className="text-xl font-normal leading-7 text-[var(--foreground-primary)]">
                  {qty}
                </span>
                <button
                  type="button"
                  className="tap-target-y p-1.5 flex items-center justify-center text-[var(--brand-foreground-on-brand)]"
                  onClick={handleQtyIncrease}
                  aria-label={t("increase_quantity")}
                >
                  <FiPlus size={20} />
                </button>
              </div>
              <button
                type="button"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-[var(--button-primary-background-default)] disabled:opacity-50 rounded-lg flex justify-center items-center gap-1"
                onClick={handleAddToCart}
              >
                <span className="text-base font-medium leading-6 text-[var(--button-primary-foreground-default)]">
                  {t("add_to_cart")} - {setting?.currency}
                  {formatAmount(totalPrice, setting?.decimal_point)}
                </span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Login showLogin={showLogin} setShowLogin={setShowLogin} />
    </>
  );
};

export default AddonCustomizationModal;