import React from "react";
import CartPage from "./CartPage";

/**
 * `/checkout` is the same thing as `/cart` now: one drawer holds both. The
 * route stays for shared links (WEB_PARITY_V4.0.2 §12.1) and for
 * DEEPLINK_SPEC.md v2, which maps `/checkout` to the cart.
 *
 * No `withAuth` any more — a guest has to be able to see their own cart. The
 * drawer prompts a login at the point it actually needs an account.
 */
const CheckoutPage = () => <CartPage />;

export default CheckoutPage;
