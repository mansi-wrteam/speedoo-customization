import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as api from "@/api/apiRoutes";
import {
  setCartProducts,
  setCartSubTotal,
  addtoGuestCart,
  subGuestCartTotal,
} from "@/redux/slices/cartSlice";
import { slugFromModuleId } from "@/utils/moduleSlug";
import { findLatestCartLine, hasAddons } from "@/utils/addonUtils";
import { fetchProductDetail, prefetchProductDetail } from "@/utils/productDetailCache";
import type { AppDispatch } from "@/redux/hooks";
import type { ApiCartItem } from "@/types/models/cart";
import type { Product } from "@/types/models/product";
import type { RootState } from "@/types/state";

export interface FoodCustomizeFlowOptions {
  /** The listing product (only `id` and `slug` are read before fetching the full product). */
  product?: Pick<Product, "id" | "slug"> | null;
  /** Called when there is nothing to customise and this is a first add. */
  onPlainAdd?: () => void;
  /** Called when there is nothing to customise and the product is already in the cart ("+"). */
  onPlainIncrease?: () => void;
}

// The food module's slug is stable across deployments; its numeric id is
// admin-configurable, so never compare against a hardcoded 4.
const FOOD_MODULE_SLUG = "food-delivery";

// Routes the listing "Add" control to the right sheet (WEB_PARITY_V4.0.1 §3.1):
//
//   tap Add
//     ├─ food module AND a cart line already exists for this product → Repeat
//     └─ otherwise                                                   → Customise
//
// Only `product_by_id` returns `addon_groups` — no listing endpoint carries
// them — so the product is fetched on tap before either sheet can open. That
// call REQUIRES latitude/longitude; without them it refuses and add-ons
// silently never appear.
//
// Keeping that tap feeling instant:
//   - hovering the card (with intent) prefetches into productDetailCache, so
//     the tap usually resolves from memory;
//   - the spinner only shows when the wait passes SPINNER_DELAY_MS;
//   - latest intent wins: cancelPending() (called when the quick view opens)
//     makes an in-flight tap drop its result instead of stacking a sheet on
//     top of the quick view.

// Below this a wait reads as instant; a spinner would only flash.
const SPINNER_DELAY_MS = 150;
// Hover this long before prefetching, so sweeping the pointer across a grid
// doesn't fire a request per card.
const HOVER_INTENT_MS = 150;
export const useFoodCustomizeFlow = ({
  product,
  onPlainAdd,
  onPlainIncrease,
}: FoodCustomizeFlowOptions) => {
  const dispatch = useDispatch<AppDispatch>();
  const city = useSelector((state: RootState) => state.City.city);
  const cart = useSelector((state: RootState) => state.Cart);
  const modules = useSelector((state: RootState) => state.Module.modules);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);

  const [detailedProduct, setDetailedProduct] = useState<Product | null>(null);
  const [repeatLine, setRepeatLine] = useState<ApiCartItem | null>(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  const isFoodModule =
    slugFromModuleId(modules, activeModuleId) === FOOD_MODULE_SLUG;

  // Bumped by every tap and by cancelPending(); a response whose token is no
  // longer current is dropped.
  const requestRef = useRef(0);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    },
    []
  );

  const detailParams = () => ({
    latitude: city?.latitude,
    longitude: city?.longitude,
    slug: product?.slug,
    id: product?.id ?? -1,
  });

  const prefetch = () => prefetchProductDetail(detailParams());

  // Spread onto the card root. Food only: other modules never open a sheet
  // from Add, so there is nothing to warm up.
  const hoverPrefetchProps = isFoodModule
    ? {
        onMouseEnter: () => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = setTimeout(prefetch, HOVER_INTENT_MS);
        },
        onMouseLeave: () => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        },
      }
    : {};

  const cancelPending = () => {
    requestRef.current += 1;
    setShowSpinner(false);
    setLoading(false);
  };

  // cart/add and cart/remove return totals but not the row, so the cart is
  // re-read after any write and mirrored into redux.
  const refreshCart = async (): Promise<ApiCartItem[]> => {
    const cartData = await api.getCart({
      latitude: city?.latitude,
      longitude: city?.longitude,
    });
    const lines = cartData?.status == 1 ? cartData?.data?.cart || [] : [];
    dispatch(
      setCartProducts({
        data: lines.map((item) => ({
          cart_id: item?.cart_id,
          product_id: item?.product_id,
          product_variant_id: item?.product_variant_id,
          qty: item?.qty,
          selected_addons: item?.selected_addons,
          addon_price: item?.addon_price,
          price: item?.price,
          discounted_price: item?.discounted_price,
        })),
      })
    );
    dispatch(setCartSubTotal({ data: cartData?.data?.sub_total ?? 0 }));
    return lines;
  };

  const openCustomise = (fetched: Product) => {
    setDetailedProduct(fetched);
    setShowAddonModal(true);
  };

  // `skipRepeat` is set by "I'll Choose" — without it the repeat check would
  // bounce the customer straight back into the Repeat sheet.
  // `increase` marks a press of "+" on a product already in the cart, so a
  // product with nothing to customise steps its quantity instead of being
  // re-added at qty 1 (`qty` is a target, not a delta).
  const openFlow = async ({ skipRepeat = false, increase = false }: { skipRepeat?: boolean; increase?: boolean } = {}) => {
    const fallback = () => (increase ? onPlainIncrease?.() : onPlainAdd?.());
    if (loading) return;
    const token = ++requestRef.current;
    const isStale = () => token !== requestRef.current;
    setLoading(true);
    const spinnerTimer = setTimeout(() => {
      if (!isStale()) setShowSpinner(true);
    }, SPINNER_DELAY_MS);
    try {
      const fetched = await fetchProductDetail(detailParams());
      // The customer moved on (opened the quick view) — drop this tap.
      if (isStale()) return;
      if (!fetched) {
        fallback();
        return;
      }

      // Nothing to customise — don't make the customer confirm an empty sheet.
      const variantCount = fetched?.variants?.length || 0;
      if (!hasAddons(fetched) && variantCount <= 1) {
        fallback();
        return;
      }

      if (!skipRepeat && !cart?.isGuest) {
        // Read the cart rather than redux: the store keeps a slim copy of each
        // line (ids and qty), while the Repeat sheet renders the row's name,
        // price and resolved add-ons.
        const lines = await refreshCart();
        if (isStale()) return;
        const line = findLatestCartLine(lines, fetched?.id);
        if (line) {
          setDetailedProduct(fetched);
          setRepeatLine(line);
          setShowRepeatModal(true);
          return;
        }
      }
      openCustomise(fetched);
    } catch (error) {
      console.log("error", error);
      if (!isStale()) fallback();
    } finally {
      clearTimeout(spinnerTimer);
      // A cancelled tap already reset these; a newer tap now owns them.
      if (!isStale()) {
        setShowSpinner(false);
        setLoading(false);
      }
    }
  };

  // "−" on the card. Add-ons let one product sit in the cart several times, so
  // this steps the most recent row — the same one Repeat would have topped up.
  const decrementLatestLine = async () => {
    if (loading) return;
    // Guests never reach the server cart, so step the device-local line.
    if (cart?.isGuest) {
      decrementGuestLine();
      return;
    }
    const line = findLatestCartLine(cart?.cartProducts, product?.id);
    if (!line) return;
    setLoading(true);
    try {
      const nextQty = Number(line?.qty || 0) - 1;
      const response =
        nextQty <= 0
          ? await api.removeFromCart({
              product_id: line?.product_id,
              product_variant_id: line?.product_variant_id,
              cart_id: line?.cart_id,
            })
          : await api.addToCart({
              product_id: line?.product_id,
              product_variant_id: line?.product_variant_id,
              qty: nextQty,
              cart_id: line?.cart_id,
            });
      if (response?.status == 1) await refreshCart();
    } catch (error) {
      console.log("error", error);
    } finally {
      setLoading(false);
    }
  };

  const decrementGuestLine = () => {
    const lines = cart?.guestCart || [];
    const line = [...lines]
      .reverse()
      .find((x) => String(x?.product_id) === String(product?.id));
    if (!line) return;
    const nextQty = Number(line?.qty || 0) - 1;
    const price = Number(line?.productPrice) || 0;
    const updated =
      nextQty <= 0
        ? lines.filter((x) => x !== line)
        : lines.map((x) => (x === line ? { ...x, qty: nextQty } : x));
    dispatch(addtoGuestCart({ data: updated }));
    dispatch(subGuestCartTotal({ data: price }));
  };

  const handleChooseMyself = () => {
    setShowRepeatModal(false);
    if (detailedProduct) {
      openCustomise(detailedProduct);
    } else {
      openFlow({ skipRepeat: true });
    }
  };

  return {
    isFoodModule,
    loading,
    /** `loading` past SPINNER_DELAY_MS — what the Add button should show. */
    showSpinner,
    openFlow,
    cancelPending,
    prefetch,
    hoverPrefetchProps,
    decrementLatestLine,
    detailedProduct,
    repeatLine,
    showAddonModal,
    setShowAddonModal,
    showRepeatModal,
    setShowRepeatModal,
    handleChooseMyself,
  };
};

export default useFoodCustomizeFlow;
