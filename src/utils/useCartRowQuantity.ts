// Quantity stepper rules for one cart row, server cart and guest cart alike.
//
// Lifted out of CartProductCard so the checkout row, and anything added later,
// cannot drift from it. Two deliberate differences from that original:
//
//  1. "Unlimited stock" is now a LOOSE `!= 0`. The old test was a strict
//     `!== 0`, which is true for the STRING "0" — so a limited product whose
//     flag arrived as "0" skipped its stock check entirely and let the customer
//     add past the shelf. Loose `!= 0` fixes that while still reading `true`
//     and a missing flag as unlimited, which is what every product card in this
//     app does (`is_unlimited_stock == 0` means limited).
//  2. The promo code is re-validated against the new subtotal after every
//     change, which §1.3 requires on the merged screen.
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import * as api from "@/api/apiRoutes";
import {
  addtoGuestCart,
  clearCartPromo,
  setCartProducts,
  setCartPromo,
  setCartSubTotal,
  setGuestCartTotal,
} from "@/redux/slices/cartSlice";
import { findGuestLine, isSameGuestLine } from "@/utils/guestCartLines";
import { t } from "@/utils/translation";
import type { AppDispatch } from "@/redux/hooks";
import type { Id } from "@/types/common";
import type { ApiCartItem, CartLine, GuestCartLine } from "@/types/models";
import type { RootState } from "@/types/state";

type Maybe<T> = T | null | undefined;

/**
 * Quiet time after the last +/- click before the server is told. Each click
 * sends an ABSOLUTE qty, read from the store, which only updates when the
 * previous request returns, so rapid clicks used to send 2, 2, 2, 3… and the
 * cart ended up lower than the number of clicks. Now the count moves on every
 * click and one request carries the final value.
 */
const QTY_DEBOUNCE_MS = 400;

/** Total quantity of a product across all its rows — the cart limit is per product, not per row. */
const quantityForProduct = (
  lines: Maybe<(CartLine | GuestCartLine)[]>,
  productId: Id | undefined
) =>
  (lines || [])
    .filter((line) => line?.product_id == productId)
    .reduce((sum, line) => sum + Number(line?.qty || 0), 0);

export const useCartRowQuantity = (row: ApiCartItem) => {
  const dispatch = useDispatch<AppDispatch>();
  const cart = useSelector((state: RootState) => state.Cart);
  const coupon = useSelector((state: RootState) => state.Cart.promo_code);

  const isThisRow = (line: Maybe<CartLine | ApiCartItem>) =>
    row?.cart_id != null
      ? line?.cart_id == row?.cart_id
      : line?.product_id == row?.product_id &&
        line?.product_variant_id == row?.product_variant_id;

  const serverLine = cart?.cartProducts?.find(isThisRow);
  const guestLine = findGuestLine(cart?.guestCart, row);
  const storeQty = Number((cart?.isGuest ? guestLine?.qty : serverLine?.qty) ?? row?.qty ?? 0);

  // Server cart only: the count shown while clicks are being collected.
  const [pendingQty, setPendingQty] = useState<number | null>(null);
  const qty = pendingQty ?? storeQty;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useRef<(() => void) | null>(null);
  // Bumped on every click; a response for an older click is ignored, since a
  // newer value is already on its way.
  const latestClick = useRef(0);

  // Leaving (drawer closed, row removed) mid-burst still saves the last value.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      flush.current?.();
    },
    []
  );

  const recalculateGuestTotal = (lines: GuestCartLine[]) => {
    const total = lines.reduce(
      (sum, line) =>
        sum +
        (Number(line?.productPrice) || 0) * Number(line?.qty || 0) +
        (Number(line?.addon_price) || 0) * Number(line?.qty || 0),
      0
    );
    dispatch(setCartSubTotal({ data: total }));
    dispatch(setGuestCartTotal({ data: total }));
  };

  /** Keep the applied promo honest about the new subtotal; drop it if it no longer qualifies. */
  const revalidatePromo = async (subTotal?: number) => {
    if (!coupon?.promo_code) return;
    try {
      const response = await api.setPromoCode({
        promoCodeName: coupon.promo_code,
        amount: subTotal,
      });
      if (response.status == 1) dispatch(setCartPromo({ data: response.data }));
      else dispatch(clearCartPromo());
    } catch (error) {
      console.log("Error", error);
    }
  };

  const setGuestQty = (nextQty: number) => {
    const lines = (cart?.guestCart || []).map((line) =>
      isSameGuestLine(line, row) ? { ...line, qty: nextQty } : line
    );
    dispatch(addtoGuestCart({ data: lines }));
    recalculateGuestTotal(lines);
  };

  const setServerQty = async (nextQty: number, clickId: number) => {
    const isLatest = () => clickId === latestClick.current;
    try {
      const response = await api.addToCart({
        product_id: row?.product_id,
        product_variant_id: row?.product_variant_id,
        qty: nextQty,
        cart_id: row?.cart_id,
      });
      if (!isLatest()) return;
      setPendingQty(null);
      if (response.status != 1) {
        // The count falls back to what the store (server) last confirmed.
        toast.error(response?.message || t("something_went_wrong"));
        return;
      }
      dispatch(
        setCartProducts({
          data: (cart?.cartProducts || []).map((line) =>
            isThisRow(line) ? { ...line, qty: nextQty } : line
          ),
        })
      );
      dispatch(setCartSubTotal({ data: response.sub_total }));
      await revalidatePromo(response.sub_total);
    } catch (error) {
      if (isLatest()) setPendingQty(null);
      console.log("Error", error);
    }
  };

  /** Show `nextQty` now; send it once the clicks stop. */
  const scheduleServerQty = (nextQty: number) => {
    setPendingQty(nextQty);
    const clickId = ++latestClick.current;
    if (timer.current) clearTimeout(timer.current);
    const send = () => {
      timer.current = null;
      flush.current = null;
      void setServerQty(nextQty, clickId);
    };
    flush.current = send;
    timer.current = setTimeout(send, QTY_DEBOUNCE_MS);
  };

  const increase = async () => {
    // Include clicks not yet sent, so the stock and cart limits still hold.
    const inCartForProduct =
      quantityForProduct(cart?.isGuest ? cart?.guestCart : cart?.cartProducts, row?.product_id) +
      (qty - storeQty);
    const unlimited = row?.is_unlimited_stock != 0;

    if (!unlimited && inCartForProduct >= Number(row?.stock ?? 0)) {
      toast.error(t("out_of_stock_message"));
      return;
    }
    if (
      row?.total_allowed_quantity != null &&
      inCartForProduct >= Number(row.total_allowed_quantity)
    ) {
      toast.error(t("max_cart_limit_error"));
      return;
    }

    if (cart?.isGuest) setGuestQty(qty + 1);
    else scheduleServerQty(qty + 1);
  };

  const decrease = async () => {
    // One is the floor: dropping to zero is a removal, which has its own button.
    if (qty <= 1) return;
    if (cart?.isGuest) setGuestQty(qty - 1);
    else scheduleServerQty(qty - 1);
  };

  return { qty, increase, decrease };
};
