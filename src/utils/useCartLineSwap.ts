// The §1.5 swap rule, shared by the Replace Item sheet and the Choose Variant
// sheet.
//
// Both sheets do the same thing: add a replacement, and only once that add has
// actually succeeded, drop the line it replaces. The order matters — removing
// first and failing to add would empty the customer's cart for nothing.
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import * as api from "@/api/apiRoutes";
import {
  addtoGuestCart,
  setCartSubTotal,
  setGuestCartTotal,
} from "@/redux/slices/cartSlice";
import { removeProductFromPrescriptions } from "@/redux/slices/checkoutSlice";
import { isSameGuestLine, newGuestLineId } from "@/utils/guestCartLines";
import { swapQuantity } from "@/utils/cartRowUtils";
import { t } from "@/utils/translation";
import type { AppDispatch } from "@/redux/hooks";
import type { Id } from "@/types/common";
import type { ApiCartItem, GuestCartLine, Product, ProductVariant } from "@/types/models";
import type { RootState } from "@/types/state";

export interface SwapTarget {
  product: Pick<Product, "id">;
  variant: Pick<ProductVariant, "id" | "price" | "discounted_price">;
  /** What the customer asked for; 1 unless they used a stepper. */
  qty?: number;
  /** Food only. Omitted (not empty) when the row has no add-ons. */
  addonIds?: Id[];
  /** Per-unit add-on total, for the guest cart's local pricing. */
  addonPrice?: number;
  /** Resolved add-on names/prices — `guest_cart` never echoes them back. */
  selectedAddons?: GuestCartLine["selected_addons"];
}

export interface UseCartLineSwapOptions {
  /** The line being replaced. Null disables the swap (plain add). */
  deadRow?: ApiCartItem | null;
  /** Called after a successful swap, so the screen can re-read the cart. */
  onSwapped?: () => void | Promise<void>;
}

export const useCartLineSwap = ({ deadRow, onSwapped }: UseCartLineSwapOptions) => {
  const dispatch = useDispatch<AppDispatch>();
  const cart = useSelector((state: RootState) => state.Cart);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const [swapping, setSwapping] = useState(false);

  /** Does the cart already hold this product+variant? Then its quantity is the customer's, not the dead row's. */
  const alreadyInCart = (productId: Id, variantId: Id) =>
    cart?.isGuest
      ? (cart?.guestCart || []).some(
          (line) =>
            line?.product_variant_id == variantId &&
            (line?.module_id == null || line?.module_id == activeModuleId)
        )
      : (cart?.cartProducts || []).some(
          (line) =>
            line?.product_id == productId && line?.product_variant_id == variantId
        );

  const swapGuestLine = (target: SwapTarget, qty: number) => {
    const price = Number(target.variant?.discounted_price) || Number(target.variant?.price) || 0;
    const withoutDead = (cart?.guestCart || []).filter(
      (line) => !deadRow || !isSameGuestLine(line, deadRow)
    );
    const hasAddons = (target.addonIds?.length || 0) > 0;
    const existing = hasAddons
      ? undefined
      : withoutDead.find((line) => line?.product_variant_id == target.variant?.id);

    const next: GuestCartLine[] = existing
      ? withoutDead.map((line) =>
          line === existing ? { ...line, qty: Number(line.qty) + qty } : line
        )
      : [
          ...withoutDead,
          {
            product_id: target.product?.id,
            product_variant_id: target.variant?.id,
            qty,
            productPrice: price,
            module_id: activeModuleId,
            ...(hasAddons
              ? {
                  guest_line_id: newGuestLineId(),
                  selected_addon_ids: target.addonIds,
                  addon_price: target.addonPrice ?? 0,
                  selected_addons: target.selectedAddons,
                }
              : {}),
          } as GuestCartLine,
        ];

    const total = next.reduce(
      (sum, line) =>
        sum + (Number(line?.productPrice) || 0) * Number(line?.qty || 0) +
        (Number(line?.addon_price) || 0) * Number(line?.qty || 0),
      0
    );
    dispatch(addtoGuestCart({ data: next }));
    dispatch(setCartSubTotal({ data: total }));
    dispatch(setGuestCartTotal({ data: total }));
    return true;
  };

  // The swap is done once add (+ remove) succeed. Re-reading the cart and its
  // charges is two more round trips; awaiting them kept the sheet open and
  // looking stuck, so the sheet closes now and the cart catches up behind it.
  const refreshInBackground = () => {
    Promise.resolve(onSwapped?.()).catch((error) => console.log("Error", error));
  };

  /**
   * Returns true when the cart changed. A refused add returns false and leaves
   * the cart exactly as it was, dead line included (§1.5).
   */
  const swapTo = async (target: SwapTarget): Promise<boolean> => {
    const requestedQty = Number(target.qty ?? 1) || 1;
    const qty = swapQuantity({
      requestedQty,
      deadRowQty: deadRow?.qty,
      alreadyInCart: alreadyInCart(target.product?.id, target.variant?.id),
    });

    setSwapping(true);
    try {
      if (cart?.isGuest) {
        const changed = swapGuestLine(target, qty);
        if (changed) refreshInBackground();
        return changed;
      }

      const added = await api.addToCart({
        product_id: target.product?.id,
        product_variant_id: target.variant?.id,
        qty,
        // Must be OMITTED, not empty, on a row without add-ons — an empty array
        // blanks the server row's add-ons.
        ...(target.addonIds?.length ? { selected_addon_ids: target.addonIds } : {}),
      });
      if (added?.status != 1) {
        toast.error(added?.message || t("something_went_wrong"));
        return false;
      }

      if (deadRow) {
        const removed = await api.removeFromCart({
          product_id: deadRow?.product_id,
          product_variant_id: deadRow?.product_variant_id,
          cart_id: deadRow?.cart_id,
        });
        if (removed?.status == 1) {
          dispatch(
            removeProductFromPrescriptions({ productId: deadRow?.product_variant_id })
          );
        }
      }
      refreshInBackground();
      return true;
    } catch (error) {
      console.log("Error", error);
      toast.error(t("something_went_wrong"));
      return false;
    } finally {
      setSwapping(false);
    }
  };

  return { swapping, swapTo };
};
