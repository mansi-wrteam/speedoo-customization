import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import * as api from "@/api/apiRoutes";
import { t } from "@/utils/translation";
import {
  setCartProducts,
  setCartSubTotal,
  addtoGuestCart,
  addGuestCartTotal,
} from "@/redux/slices/cartSlice";
import {
  getAddonName,
  getOptionPrice,
  getSelectedAddonsTotal,
  flattenSelections,
} from "@/utils/addonUtils";
import { newGuestLineId, sameAddonSet } from "@/utils/guestCartLines";
import type { LiveAddonGroup } from "@/utils/addonUtils";
import type { AppDispatch } from "@/redux/hooks";
import type { Id } from "@/types/common";
import type { AddonSelections, Product, ProductVariant } from "@/types/models";
import type { RootState } from "@/types/state";

export interface AddonCartAddParams {
  product: Product | null;
  variant: ProductVariant | null | undefined;
  qty: number;
  groups: LiveAddonGroup[];
  selections: AddonSelections;
}

export const variantPrice = (v: ProductVariant | null | undefined) =>
  Number(v?.discounted_price) > 0 ? Number(v!.discounted_price) : Number(v?.price) || 0;

// The Customise sheet's cart write (§3.2), shared with the food module's quick
// view. Resolves true once the line is in the cart; on a rejected write the
// caller stays open so the customer can adjust.
export const useAddonCartAdd = () => {
  const dispatch = useDispatch<AppDispatch>();
  const city = useSelector((state: RootState) => state.City.city);
  const cart = useSelector((state: RootState) => state.Cart);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const [submitting, setSubmitting] = useState(false);

  // Guest lines keep the shape the product cards build, plus the add-on fields
  // when there are any. An identical (variant + add-on set) tops up the
  // existing line; a different add-on set becomes its own line, which is why
  // those lines carry a `guest_line_id`.
  const addToGuestCart = ({ product, variant, qty, groups, selections }: AddonCartAddParams) => {
    const selected_addon_ids = flattenSelections(selections);
    const addonsTotal = getSelectedAddonsTotal(groups, selections);
    const price = variantPrice(variant);
    const lines = cart?.guestCart || [];
    const existing = lines.find(
      (line) =>
        line?.product_id == product?.id &&
        line?.product_variant_id == variant?.id &&
        sameAddonSet(line?.selected_addon_ids, selected_addon_ids)
    );
    // Shaped like the server's `selected_addons` so a guest line renders
    // through the same cart markup as a logged-in one.
    const selectedAddonNames = () =>
      groups.flatMap((group) =>
        (group?.options || [])
          .filter((option) => (selections[group.id] || []).includes(option?.id))
          .map((option) => ({
            id: option?.id,
            name: getAddonName(option),
            price: getOptionPrice(option),
          }))
      );
    const updated = existing
      ? lines.map((line) =>
          line === existing
            ? { ...line, qty: Number(line?.qty || 0) + qty }
            : line
        )
      : [
          ...lines,
          {
            product_id: product?.id as Id,
            product_variant_id: variant?.id as Id,
            qty,
            productPrice: price,
            module_id: activeModuleId,
            ...(selected_addon_ids.length > 0
              ? {
                  guest_line_id: newGuestLineId(),
                  selected_addon_ids,
                  addon_price: addonsTotal,
                  // Resolved now: `guest_cart` prices variants only and never
                  // echoes add-on names back.
                  selected_addons: selectedAddonNames(),
                }
              : {}),
          },
        ];
    dispatch(addtoGuestCart({ data: updated }));
    dispatch(addGuestCartTotal({ data: (price + addonsTotal) * qty }));
    toast.success(t("items_added_to_cart"));
  };

  const addWithAddons = async (params: AddonCartAddParams): Promise<boolean> => {
    if (submitting) return false;

    // A guest belongs in the device-local cart, add-ons included — the server
    // cart endpoint would be an unauthenticated write. The add-ons are replayed
    // onto the real cart at login.
    if (cart?.isGuest) {
      addToGuestCart(params);
      return true;
    }

    setSubmitting(true);
    try {
      const response = await api.addToCart({
        product_id: params.product?.id,
        product_variant_id: params.variant?.id,
        qty: params.qty,
        selected_addon_ids: flattenSelections(params.selections),
      });
      if (response?.status === 1) {
        // cart/add returns totals but not the row, so re-read before rendering.
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
          }));
          dispatch(setCartProducts({ data: productsData! }));
          dispatch(setCartSubTotal({ data: cartData?.data?.sub_total }));
        }
        toast.success(t("items_added_to_cart"));
        return true;
      }
      toast.error(response?.message);
      return false;
    } catch (error) {
      console.log("error", error);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { addWithAddons, submitting };
};

export default useAddonCartAdd;
