// Row-level actions on the checkout screen: remove, and §1.6 "Move to
// favorites" / un-favourite.
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import * as api from "@/api/apiRoutes";
import {
  addtoGuestCart,
  setCartProducts,
  setCartSubTotal,
  setGuestCartTotal,
} from "@/redux/slices/cartSlice";
import { removeProductFromPrescriptions } from "@/redux/slices/checkoutSlice";
import { isSameGuestLine } from "@/utils/guestCartLines";
import { t } from "@/utils/translation";
import type { AppDispatch } from "@/redux/hooks";
import type { ApiCartItem, GuestCartLine } from "@/types/models";
import type { RootState } from "@/types/state";

export interface UseCartRowActionsOptions {
  /** Re-read the cart after a change the server owns. */
  onChanged?: () => void | Promise<void>;
  /** Signed-out customers get a login prompt instead of a wishlist write. */
  onLoginRequired?: () => void;
}

export const useCartRowActions = ({
  onChanged,
  onLoginRequired,
}: UseCartRowActionsOptions = {}) => {
  const dispatch = useDispatch<AppDispatch>();
  const cart = useSelector((state: RootState) => state.Cart);
  const user = useSelector((state: RootState) => state.User);
  const [busyRowKey, setBusyRowKey] = useState<string | null>(null);

  const rowKey = (row: ApiCartItem) =>
    String(row?.cart_id ?? row?.guest_line_id ?? row?.product_variant_id);

  const isThisRow = (line: { cart_id?: unknown; product_id?: unknown; product_variant_id?: unknown }, row: ApiCartItem) =>
    row?.cart_id != null
      ? line?.cart_id == row?.cart_id
      : line?.product_id == row?.product_id &&
        line?.product_variant_id == row?.product_variant_id;

  const removeGuestRow = (row: ApiCartItem) => {
    const lines = (cart?.guestCart || []).filter(
      (line) => !isSameGuestLine(line, row)
    ) as GuestCartLine[];
    const total = lines.reduce(
      (sum, line) =>
        sum +
        (Number(line?.productPrice) || 0) * Number(line?.qty || 0) +
        (Number(line?.addon_price) || 0) * Number(line?.qty || 0),
      0
    );
    dispatch(addtoGuestCart({ data: lines }));
    dispatch(setCartSubTotal({ data: total }));
    dispatch(setGuestCartTotal({ data: total }));
  };

  /** `cart/remove` with `qty=0` for one row; without `cart_id` the server drops every add-on combination. */
  const remove = async (row: ApiCartItem) => {
    setBusyRowKey(rowKey(row));
    try {
      if (cart?.isGuest) {
        removeGuestRow(row);
      } else {
        const response = await api.removeFromCart({
          product_id: row?.product_id,
          product_variant_id: row?.product_variant_id,
          cart_id: row?.cart_id,
        });
        if (response?.status != 1) {
          toast.error(response?.message || t("something_went_wrong"));
          return;
        }
        dispatch(
          setCartProducts({
            data: (cart?.cartProducts || []).filter((line) => !isThisRow(line, row)),
          })
        );
        dispatch(setCartSubTotal({ data: response?.sub_total }));
      }
      dispatch(removeProductFromPrescriptions({ productId: row?.product_variant_id }));
      await onChanged?.();
    } catch (error) {
      console.log("Error", error);
    } finally {
      setBusyRowKey(null);
    }
  };

  /**
   * §1.6: favourite the product, then drop the row. The order matters — losing
   * the row before the wishlist write succeeded would lose the item entirely.
   */
  const moveToFavorites = async (row: ApiCartItem) => {
    if (!user?.jwtToken) {
      onLoginRequired?.();
      toast.error(t("required_login_message_for_wishlist"));
      return;
    }
    setBusyRowKey(rowKey(row));
    try {
      const response = await api.addToFavorite({ product_id: row?.product_id });
      if (response?.status != 1) {
        toast.error(response?.message || t("something_went_wrong"));
        return;
      }
      await remove(row);
      toast.success(t("moved_to_favorites"));
    } catch (error) {
      console.log("Error", error);
    } finally {
      setBusyRowKey(null);
    }
  };

  /**
   * The heart badge on an already-favourite row un-favourites it; the row stays.
   *
   * `onChanged` runs whatever the server said, including on a refused or failed
   * call: the caller drops the heart optimistically, so a silent failure would
   * leave the row showing the wrong state until a manual refresh.
   */
  const unfavorite = async (row: ApiCartItem) => {
    if (!user?.jwtToken) {
      onLoginRequired?.();
      return;
    }
    try {
      const response = await api.removeFromFavorite({ product_id: row?.product_id });
      if (response?.status != 1) {
        toast.error(response?.message || t("something_went_wrong"));
      }
    } catch (error) {
      console.log("Error", error);
      toast.error(t("something_went_wrong"));
    } finally {
      await onChanged?.();
    }
  };

  return { remove, moveToFavorites, unfavorite, busyRowKey, rowKey };
};
