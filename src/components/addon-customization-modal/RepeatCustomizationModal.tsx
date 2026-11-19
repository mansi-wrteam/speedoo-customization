import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, closeButtonClass } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { toast } from "react-toastify";
import * as api from "@/api/apiRoutes";
import { t } from "@/utils/translation";
import { formatPriceDisplay, cn } from "@/lib/utils";
import { setCartProducts, setCartSubTotal } from "@/redux/slices/cartSlice";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { getVariantLabel } from "@/utils/variantUtils";
import { getAddonName } from "@/utils/addonUtils";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { ApiCartItem, Product, ProductVariant } from "@/types/models";

export interface RepeatCustomizationModalProps {
  /** Full product from `product_by_id` (fallback name / image / variant label). */
  product: Product | null;
  /** The product's most recent server cart row — everything rendered comes from it. */
  cartLine: ApiCartItem | null;
  showRepeatModal: boolean;
  setShowRepeatModal: React.Dispatch<React.SetStateAction<boolean>>;
  /** "I'll choose" — closes this sheet and opens the Customise sheet. */
  onChooseMyself: () => void;
}

// A bare stroked check, per the spec's asset — not a circled badge (§3.3).
const CheckMark = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path
      d="M3.96 9.36L7.32024 12.6L14.04 6.12"
      stroke="currentColor"
      strokeWidth="1.44"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Repeat sheet (WEB_PARITY_V4.0.1 §3.3) — food module only.
// Offers the customer their previous customisation of this product. Everything
// rendered comes from the existing cart line, so there is nothing to fetch.
const RepeatCustomizationModal = ({
  product,
  cartLine,
  showRepeatModal,
  setShowRepeatModal,
  onChooseMyself,
}: RepeatCustomizationModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const city = useSelector((state: RootState) => state.City.city);

  const [submitting, setSubmitting] = useState(false);

  const price = Number(cartLine?.price) || 0;
  const discounted = Number(cartLine?.discounted_price) || 0;
  const effectivePrice = discounted > 0 ? discounted : price;
  const isDiscounted = discounted > 0 && discounted !== price;

  const name = cartLine?.name || product?.translations?.name;
  // A cart row carries the variant label fields (measurement/unit/attribute_values).
  const variantLabel = getVariantLabel(cartLine as ProductVariant | null) || getVariantLabel(product?.variants?.[0]);
  const addons = cartLine?.selected_addons || [];

  const handleClose = () => setShowRepeatModal(false);

  // Repeat → cart/add with that line's cart_id and qty = current + 1. The
  // add-ons are deliberately not resent: the server keeps them when
  // `selected_addon_ids` is absent and a cart_id is given.
  const handleRepeat = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await api.addToCart({
        product_id: cartLine?.product_id,
        product_variant_id: cartLine?.product_variant_id,
        qty: Number(cartLine?.qty || 0) + 1,
        cart_id: cartLine?.cart_id,
      });
      if (response?.status === 1) {
        const cartData = await api.getCart({
          latitude: city?.latitude,
          longitude: city?.longitude,
        });
        if (cartData?.status === 1) {
          const productsData = cartData?.data?.cart?.map((item) => ({
            cart_id: item?.cart_id,
            product_id: item?.product_id,
            product_variant_id: item?.product_variant_id,
            qty: item?.qty,
            selected_addons: item?.selected_addons,
            addon_price: item?.addon_price,
            price: item?.price,
            discounted_price: item?.discounted_price,
          }));
          dispatch(setCartProducts({ data: productsData! }));
          dispatch(setCartSubTotal({ data: cartData?.data?.sub_total }));
        }
        handleClose();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.log("error", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={showRepeatModal}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between gap-1 border-b border-[var(--border-default)] px-4 py-2 text-start space-y-0">
          <span className="flex-1 text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
            {t("repeat_previous_customization")}
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-4 bg-[var(--brand-background-subtle)] border-b border-[var(--border-subtle)] flex items-center gap-3">
            <div className="size-16 shrink-0 p-1 bg-[var(--surface-default)] rounded-lg outline outline-1 outline-[var(--border-subtle)] relative">
              <ImageWithPlaceholder
                src={cartLine?.image_url || product?.image_url}
                alt={name}
                fill
                sizes="64px"
                className="object-contain"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="text-base font-semibold leading-6 text-[var(--foreground-primary)] line-clamp-1">
                {name}
              </div>
              <div className="flex flex-col justify-center items-start gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold leading-5 text-[var(--brand-foreground-default)]">
                    {setting?.currency}
                    {formatPriceDisplay(effectivePrice)}
                  </span>
                  {isDiscounted ? (
                    <span className="text-sm font-medium leading-5 text-[var(--foreground-tertiary)] line-through">
                      {setting?.currency}
                      {formatPriceDisplay(price)}
                    </span>
                  ) : null}
                </div>
                {variantLabel ? (
                  <div className="text-sm font-medium leading-5 text-[var(--foreground-primary)]">
                    {variantLabel}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {addons.length > 0 ? (
            <div className="p-4">
              <div className="rounded-xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] overflow-hidden">
                {addons.map((addon, idx) => (
                  <div
                    key={addon?.id ?? idx}
                    className={`p-3 flex items-center gap-2 ${
                      idx < addons.length - 1
                        ? "border-b border-[var(--border-subtle)]"
                        : ""
                    }`}
                  >
                    <span className="flex-1 text-sm font-normal leading-5 text-[var(--foreground-secondary)] line-clamp-1">
                      {getAddonName(addon)}
                    </span>
                    <span className="shrink-0 text-[var(--brand-foreground-default)]">
                      <CheckMark />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 p-4 border-t border-[var(--border-subtle)] flex items-center gap-4">
          <button
            type="button"
            className="flex-1 px-4 py-2 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-base font-medium leading-6 text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--surface-subtle)]"
            onClick={onChooseMyself}
          >
            {t("ill_choose")}
          </button>
          <button
            type="button"
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--button-primary-background-default)] disabled:opacity-50 text-base font-medium leading-6 text-[var(--button-primary-foreground-default)]"
            onClick={handleRepeat}
          >
            {t("repeat")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RepeatCustomizationModal;
