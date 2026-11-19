import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import Homepage from "./Homepage";
import { openCartDrawer } from "@/redux/slices/uiSlice";
import type { AppDispatch } from "@/redux/hooks";

/**
 * `/cart` is not a page any more — cart and checkout both live in the drawer.
 *
 * The route is kept because it is a public URL: the Flutter app's Share writes
 * `<website>/cart` and `/checkout` (WEB_PARITY_V4.0.2 §12.1), and
 * DEEPLINK_SPEC.md v2 maps `/checkout` to the cart. So the route renders Home
 * and opens the drawer over it — a shared link still lands on the cart, and
 * closing the drawer leaves the visitor somewhere useful.
 */
const CartPage = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(openCartDrawer());
  }, [dispatch]);

  return <Homepage />;
};

export default CartPage;
