import * as api from "@/api/apiRoutes";
import {
  clearCartPromo,
  setCart,
  setCartProducts,
  setCartSubTotal,
} from "@/redux/slices/cartSlice";
import { clearCheckout } from "@/redux/slices/checkoutSlice";
import { clearImages } from "@/utils/prescriptionImageStore";
import type { AppDispatch } from "@/redux/hooks";

/**
 * Empty the cart once an order has been placed and paid for.
 *
 * The store is reset first and synchronously, so callers can run this right
 * before redirecting to /web-payment-status and the header never shows the
 * old cart there. The server cart is then emptied best-effort: a failed
 * deleteCart is logged, it does not bring the cart back.
 */
export const clearPlacedOrderCart = async (dispatch: AppDispatch) => {
  dispatch(setCart({ data: [] }));
  dispatch(clearCartPromo());
  dispatch(setCartSubTotal({ data: 0 }));
  dispatch(setCartProducts({ data: [] }));
  dispatch(clearCheckout());
  clearImages(); // drop the stored prescription blobs with the checkout
  try {
    const response = await api.deleteCart();
    if (response.status !== 1) console.error("Error clearing cart", response);
  } catch (error) {
    console.error("Error", error);
  }
};
