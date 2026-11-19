import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RiCloseFill, RiCoupon3Line } from "react-icons/ri";
import { BiEditAlt } from "react-icons/bi";
import { MdChevronRight, MdOutlinePayment, MdOutlineWatchLater } from "react-icons/md";
import { IoBagHandleOutline } from "react-icons/io5";
import { FiAlertCircle } from "react-icons/fi";

import CartDrawerSkeletons from "./CartDrawerLoading";
import PrescriptionRequiredPanel from "./PrescriptionRequiredPanel";
import DrawerSection from "../cart-checkout/DrawerSection";
import DeliveryModeTabs from "../cart-checkout/DeliveryModeTabs";
import CheckoutAddressHeader from "../cart-checkout/CheckoutAddressHeader";
import CheckoutItemRow from "../cart-checkout/CheckoutItemRow";
import UnavailableItemsCard from "../cart-checkout/UnavailableItemsCard";
import BillDetailsCard from "../cart-checkout/BillDetailsCard";
import PaymentAccordion from "../cart-checkout/PaymentAccordion";
import PreferredDeliveryModal from "../cart-checkout/PreferredDeliveryModal";
import CouponModal from "../cart-checkout/CouponModal";
import QuickDeliveryCard from "../quick-delivery/QuickDeliveryCard";
import NoCartData from "@/assets/Empty_Cart.svg";

import * as api from "@/api/apiRoutes";
import {
  addtoGuestCart,
  clearCartPromo,
  setCart,
  setCartCheckout,
  setCartProducts,
  setCartPromo,
  setCartSubTotal,
  setDoorStepDeliveryMode,
  setGuestCartTotal,
  setSelfPickupMode,
} from "@/redux/slices/cartSlice";
import { setAllAddresses } from "@/redux/slices/addressSlice";
import {
  resetCheckoutFlow,
  setAddress,
  setCheckoutTotal,
  setOrderNote,
  setOrderType,
  setPaymentMethod,
  setPhonePeCheckoutDetails,
  setSelectedDate,
  setTimeSlot,
  setUserWalletBalance,
  setWalletChecked,
} from "@/redux/slices/checkoutSlice";
import { setCurrentUser } from "@/redux/slices/userSlice";
import { setListingSource } from "@/redux/slices/productFilterSlice";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { t } from "@/utils/translation";
import { clearPlacedOrderCart } from "@/utils/clearPlacedOrderCart";
import {
  formatSlotDuration,
  getAvailableQuickSlot,
  getShipmentItemCount,
  isQuickDelivery,
  isSlotClosed,
  isTimeSlotsEnabled,
  showsDeliverySchedule,
} from "@/utils/timeSlotUtils";
import { expandGuestRows, guestAddonsTotal, hasGuestAddons } from "@/utils/guestCartLines";
import {
  isCodAllowed,
  splitCartRows,
  walletCoversOrder,
} from "@/utils/cartRowUtils";
import {
  getUncoveredRequiredVariantIds,
  isPrescriptionContext,
} from "@/utils/prescriptionGroups";
import { useCartRowActions } from "@/utils/useCartRowActions";
import { useGuestCartMerge } from "@/utils/useGuestCartMerge";
import { formatAmount } from "@/lib/utils";

import type { AppDispatch } from "@/redux/hooks";
import type { Id, Numeric } from "@/types/common";
import type {
  ApiCartItem,
  CartData,
  CartLine,
  OrderType,
  PaymentMethod,
  TimeSlot,
  TimeSlotsResponse,
} from "@/types/models";
import type { RootState } from "@/types/state";

const Login = dynamic(() => import("../login/Login"), { ssr: false });
const NewAddressModal = dynamic(() => import("../newaddressmodal/NewAddressModal"), { ssr: false });
const AddressPickerModal = dynamic(() => import("../cart-checkout/AddressPickerModal"), { ssr: false });
const ReplaceItemModal = dynamic(() => import("../cart-checkout/ReplaceItemModal"), { ssr: false });
const GuestCartConflictModal = dynamic(
  () => import("../cart-checkout/GuestCartConflictModal"),
  { ssr: false }
);
const ChooseVariantModal = dynamic(() => import("../cart-checkout/ChooseVariantModal"), { ssr: false });
const StripeModal = dynamic(() => import("../cart-checkout/StripeModal"), { ssr: false });
const WalletBalanceModal = dynamic(
  () => import("../profiledashboard/wallet/WalletBalanceModal"),
  { ssr: false }
);

/** Razorpay Checkout `handler` argument; all three ids go to add_transaction. */
interface RazorpaySuccessResponse {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface CartDrawerProps {
  showCart: boolean;
  onClose: () => void;
  /** Header's mobile bottom-nav tab; forwarded to Login. */
  setMobileActiveKey: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Cart AND checkout, in the drawer (WEB_PARITY_V4.0.2 §1).
 *
 * There is no cart page and no checkout page any more: items, address,
 * schedule, offers, bill and payment are one scrolling column here, and
 * `/cart` and `/checkout` are routes that open this over Home (they stay
 * because shared links from the app point at them — §12.1).
 *
 * Guests see their items and subtotal; anything needing an account — address,
 * offers, slots, paying — prompts a login from inside the drawer.
 */
const CartDrawer = ({ showCart, onClose, setMobileActiveKey }: CartDrawerProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();

  const city = useSelector((state: RootState) => state.City.city);
  const cart = useSelector((state: RootState) => state.Cart);
  const user = useSelector((state: RootState) => state.User);
  const setting = useSelector((state: RootState) => state.Setting);
  const checkout = useSelector((state: RootState) => state.Checkout);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);

  const signedIn = Boolean(user?.jwtToken);

  const [rows, setRows] = useState<ApiCartItem[]>([]);
  const [checkoutData, setCheckoutData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [checkOutError, setCheckOutError] = useState(false);
  const [checkOutErrorMsg, setCheckOutErrorMsg] = useState<string | undefined>("");
  /** Why the last cart read failed; null when it succeeded. */
  const [cartLoadError, setCartLoadError] = useState<string | null>(null);
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set());

  const [timeSlotsData, setTimeSlotsData] = useState<TimeSlotsResponse | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);

  const [showLogin, setShowLogin] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [replaceRow, setReplaceRow] = useState<ApiCartItem | null>(null);
  const [variantRow, setVariantRow] = useState<ApiCartItem | null>(null);
  const [clearingUnavailable, setClearingUnavailable] = useState(false);

  const [showWalletTopUp, setShowWalletTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);
  const [toppedUp, setToppedUp] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showStripe, setShowStripe] = useState(false);
  const [stripeOrderId, setStripeOrderId] = useState<Id | null | undefined>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null | undefined>(null);
  const [stripeTransactionId, setStripeTransactionId] = useState<string | null | undefined>(null);

  const paymentInFlight = placing || paymentLoading;
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const { available, unavailable } = useMemo(() => splitCartRows(rows), [rows]);
  // Units, not rows — and unavailable lines do not count towards the shipment (§1.5).
  const shipmentUnits = getShipmentItemCount(available);

  const quickSlot = isTimeSlotsEnabled(timeSlotsData)
    ? getAvailableQuickSlot(timeSlots, checkout?.selectedDate)
    : null;
  const isQuickCheckout = Boolean(quickSlot);

  // Both arrive as Numeric and only on fixed-window modules; express ones omit
  // them. Parsed with defaults so the day strip never gets an Invalid Date.
  const estimateDays = parseInt(String(timeSlotsData?.delivery_estimate_days), 10) || 1;
  const allowedDays =
    parseInt(String(timeSlotsData?.time_slots_allowed_days), 10) ||
    parseInt(String(setting?.setting?.time_slots_allowed_days), 10) ||
    15;

  const isPickup = checkout?.orderType === "selfpickup";
  const doorstepAllowed = cart?.doorstep_delivery_mode != 0;
  // Quick Delivery has no store pickup (see the effect that forces doorstep).
  // Counting it as allowed here left a live Store Pickup tab that the effect
  // flipped straight back — a click that fired two charges calls and did nothing.
  const pickupAllowed = cart?.self_pickup_mode != 0 && !isQuickCheckout;
  // Both modes, or neither (each tab then explains itself). Exactly one mode has
  // nothing to choose.
  const showModeTabs = doorstepAllowed === pickupAllowed;

  const walletBalance = Number(user?.user?.balance ?? 0);
  const orderTotal = Number(checkoutData?.total_amount ?? 0);
  const walletUsed = checkout?.isWalletChecked ? Math.min(walletBalance, orderTotal) : 0;
  const walletCovers =
    Boolean(checkout?.isWalletChecked) && walletCoversOrder(orderTotal, walletBalance);
  const amountDue = Math.max(orderTotal - walletUsed, 0);
  const codAllowed = isCodAllowed(checkoutData, setting?.payment_setting);
  const showRxChip = isPrescriptionContext(rows, activeModuleId);
  const uncoveredRx = getUncoveredRequiredVariantIds(rows, checkout?.prescriptionGroups);
  const currency = setting?.setting?.currency ?? "";
  const decimals = setting?.setting?.decimal_point;

  const footerTotal = signedIn && !checkOutError ? amountDue : Number(cart?.cartSubTotal ?? 0);

  // ── Loading ───────────────────────────────────────────────────────────────

  const fetchGuestCart = useCallback(async () => {
    const moduleGuestCart =
      cart?.guestCart?.filter((line) => line?.module_id == activeModuleId) || [];
    if (moduleGuestCart.length === 0) {
      setRows([]);
      return;
    }
    try {
      const response = await api.getGuestCart({
        latitude: city?.latitude,
        longitude: city?.longitude,
        variant_ids: moduleGuestCart.map((line) => line.product_variant_id).join(","),
        quantities: moduleGuestCart.map((line) => line.qty).join(","),
      });
      if (response.status != 1) return;
      // Only add-on carts need rebuilding — without them `guest_cart` already
      // returns one row per line.
      if (hasGuestAddons(moduleGuestCart)) {
        const total =
          Number(response?.data?.sub_total || 0) + guestAddonsTotal(moduleGuestCart);
        setRows(expandGuestRows(response.data.cart, moduleGuestCart));
        dispatch(setCartSubTotal({ data: total }));
        dispatch(setGuestCartTotal({ data: total }));
      } else {
        setRows(response.data.cart || []);
        dispatch(setCartSubTotal({ data: response?.data?.sub_total }));
        dispatch(setGuestCartTotal({ data: response?.data?.sub_total as Numeric }));
      }
    } catch (error) {
      console.log("Error", error);
    }
  }, [activeModuleId, cart?.guestCart, city?.latitude, city?.longitude, dispatch]);

  const fetchServerCart = useCallback(async () => {
    // On first load the module list and the location are still arriving; a
    // cart read without them (no X-Module-Id, no lat/lng) makes the API 500.
    // The effects below read the cart again once both are in.
    if (!activeModuleId || city?.latitude == null || city?.longitude == null) return;
    try {
      const response = await api.getCart({
        latitude: city?.latitude,
        longitude: city?.longitude,
      });
      // An empty cart comes back as status 1 with `cart: []`, so status 0 is
      // always a failure (e.g. the delivery-distance lookup). Wiping the cart
      // here showed a full cart as "Your Cart Is Empty"; keep what we had and
      // say what went wrong instead.
      if (response?.status != 1) {
        setCartLoadError(response?.message || t("something_went_wrong"));
        return;
      }
      setCartLoadError(null);
      const cartRows = response?.data?.cart || [];
      setRows(cartRows);
      dispatch(setCartSubTotal({ data: response?.data?.sub_total }));
      dispatch(
        setSelfPickupMode({ data: response?.data?.self_pickup_mode as Numeric | undefined })
      );
      dispatch(
        setDoorStepDeliveryMode({
          data: response?.data?.doorstep_delivery_mode as Numeric | undefined,
        })
      );
      dispatch(
        setCartProducts({
          data: cartRows.map((row) => ({
            // cart_id makes an add-on line addressable: (product, variant) is
            // no longer unique once add-ons are in play.
            cart_id: row?.cart_id,
            product_id: row?.product_id,
            product_variant_id: row?.product_variant_id,
            qty: row?.qty,
            selected_addons: row?.selected_addons,
            addon_price: row?.addon_price,
            price: row?.price,
            discounted_price: row?.discounted_price,
          })) as CartLine[],
        })
      );
    } catch (error) {
      console.log("Error", error);
      setCartLoadError(t("something_went_wrong"));
    }
  }, [activeModuleId, city?.latitude, city?.longitude, dispatch]);

  const refreshCart = useCallback(async () => {
    // No token means no member cart, whatever a stale persisted `isGuest`
    // says: reading it would only 401.
    if (cart?.isGuest || !signedIn) {
      setCartLoadError(null);
      await fetchGuestCart();
    } else await fetchServerCart();
  }, [cart?.isGuest, signedIn, fetchGuestCart, fetchServerCart]);

  // §1.3 step 1 / §1.8: the device cart moves into the account right after
  // sign-in AND every time checkout opens, so a cart built while signed out is
  // never stranded.
  const {
    merging,
    conflictLines,
    runMerge,
    resolveConflict: resolveSellerConflict,
  } = useGuestCartMerge({ onMerged: refreshCart });

  /** Charges: delivery charge, COD flag, totals. Signed-in only — the endpoint needs the account's cart. */
  const fetchCharges = useCallback(async () => {
    if (!signedIn) return;
    // Until an address is held there is nothing to price, and the API rejects
    // the call ("The latitude field is required"). The address effect below
    // calls again once one is picked.
    if (checkout?.address?.latitude == null || checkout?.address?.longitude == null) return;
    setChargesLoading(true);
    try {
      const response = await api.getCart({
        latitude: checkout?.address?.latitude,
        longitude: checkout?.address?.longitude,
        checkout: 1,
        promocode_id: cart?.promo_code?.promo_code_id,
        order_type: checkout?.orderType,
        is_free_delivery: checkout?.timeSlot?.is_free_delivery,
      });
      if (response?.status == 1) {
        dispatch(setCartCheckout({ data: response?.data }));
        dispatch(setCheckoutTotal({ data: response?.data?.total_amount as number }));
        setCheckoutData(response?.data ?? null);
        setCheckOutError(false);
      } else {
        setCheckOutError(true);
        setCheckOutErrorMsg(response?.message);
      }
    } catch (error) {
      console.log("Error", error);
      setCheckOutError(true);
    } finally {
      setChargesLoading(false);
    }
  }, [
    cart?.promo_code?.promo_code_id,
    checkout?.address?.latitude,
    checkout?.address?.longitude,
    checkout?.orderType,
    checkout?.timeSlot?.is_free_delivery,
    dispatch,
    signedIn,
  ]);

  /** Re-validate the applied promo against the current subtotal (§1.3 step 3). */
  const revalidatePromo = useCallback(async () => {
    if (!signedIn || !cart?.promo_code?.promo_code) return;
    try {
      const response = await api.setPromoCode({
        promoCodeName: cart?.promo_code?.promo_code,
        amount: cart?.cartSubTotal as number,
      });
      if (response.status == 1) dispatch(setCartPromo({ data: response.data }));
      else dispatch(clearCartPromo());
    } catch (error) {
      console.log("Error", error);
    }
  }, [cart?.cartSubTotal, cart?.promo_code?.promo_code, dispatch, signedIn]);

  const fetchAddresses = useCallback(async () => {
    if (!signedIn) return;
    try {
      const response = await api.getAddress();
      if (response.status != 1) {
        dispatch(setAllAddresses({ data: [] }));
        dispatch(setAddress({ data: null }));
        return;
      }
      const list = response?.data || [];
      dispatch(setAllAddresses({ data: list }));

      // The picker can edit or delete the address checkout is holding. Keep it
      // if it survived (with its edits), fall back to the first remaining one,
      // and clear it when none are left (§1.3).
      const held = checkout?.address
        ? list.find((item) => item?.id == checkout?.address?.id)
        : undefined;
      if (held) {
        dispatch(setAddress({ data: held }));
        return;
      }
      dispatch(
        setAddress({ data: list.find((item) => item?.is_default == 1) ?? list[0] ?? null })
      );
    } catch (error) {
      console.log("Error", error);
    }
  }, [checkout?.address, dispatch, signedIn]);

  const filterTimeSlots = useCallback(
    (slots: TimeSlot[], date: Date | string | null | undefined) => {
      // last_order_time: null means the slot never closes.
      setAvailableTimeSlots(
        slots.map((slot) => ({ ...slot, isDisabled: isSlotClosed(slot, date) }))
      );
    },
    []
  );

  const fetchTimeSlots = useCallback(async () => {
    try {
      const response = await api.getTimeSlots();
      const slots = response?.data?.time_slots || [];
      setTimeSlotsData(response?.data ?? null);
      setTimeSlots(slots);
      filterTimeSlots(slots, checkout?.selectedDate);

      // Quick Delivery has nothing to choose, so select its one express slot up
      // front — otherwise the "pick a time slot" guard blocks checkout.
      const quick = isTimeSlotsEnabled(response?.data)
        ? getAvailableQuickSlot(slots, checkout?.selectedDate)
        : null;
      if (quick) {
        dispatch(setTimeSlot({ data: quick }));
        return;
      }
      // §1.3 step 6: select the first slot that is still open.
      if (isTimeSlotsEnabled(response?.data) && !checkout?.timeSlot) {
        const firstOpen = slots.find((slot) => !isSlotClosed(slot, checkout?.selectedDate));
        if (firstOpen) dispatch(setTimeSlot({ data: firstOpen }));
      }
    } catch (error) {
      console.log("Error", error);
    }
    // selectedDate/timeSlot are read for the initial pick only; adding them here
    // would refetch the slot list on every date change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filterTimeSlots]);

  const fetchFavorites = useCallback(async () => {
    if (!signedIn) return;
    try {
      const response = await api.getFavorite({
        latitude: city?.latitude,
        longitude: city?.longitude,
        limit: 100,
        offset: 0,
      });
      if (response?.status != 1) return;
      setFavoriteProductIds(
        new Set((response?.data || []).map((product) => String(product?.id)))
      );
    } catch (error) {
      console.log("Error", error);
    }
  }, [city?.latitude, city?.longitude, signedIn]);

  const fetchUser = useCallback(async () => {
    if (!signedIn) return;
    try {
      const response = await api.getUser();
      dispatch(setCurrentUser({ data: response.user }));
    } catch (error) {
      console.log("Error", error);
    }
  }, [dispatch, signedIn]);

  // Opening the drawer is what loads checkout: cart, promo, charges, addresses,
  // slots, wallet balance, favourites.
  useEffect(() => {
    if (!showCart) return;
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      // Merge first: reading the cart before it would show the account cart
      // without the lines that are about to land in it.
      await runMerge();
      if (cancelled) return;
      await refreshCart();
      if (cancelled) return;
      await Promise.all([
        revalidatePromo(),
        fetchAddresses(),
        fetchTimeSlots(),
        fetchUser(),
        fetchFavorites(),
      ]);
      if (cancelled) return;
      setLoading(false);
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
    // Re-bootstrap when the drawer opens, on module switch and on sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCart, activeModuleId, signedIn]);

  // Closing the drawer is what "leaving checkout" means now, so the flow reset
  // moved here from Header's route-change effect — a route change with the
  // drawer open would otherwise wipe the address and slot mid-checkout.
  // Prescriptions survive on purpose: they belong to the cart (resetCheckoutFlow
  // keeps them; clearCheckout is for post-order).
  useEffect(() => {
    if (showCart || paymentInFlight) return;
    dispatch(resetCheckoutFlow());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCart]);

  // Signing in from the header, with the drawer closed, still has to move the
  // device cart across — otherwise the badge keeps counting guest lines.
  useEffect(() => {
    if (!signedIn) return;
    runMerge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Keep the header count badge honest when the module or the location changes
  // with the drawer closed.
  useEffect(() => {
    if (showCart) return;
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModuleId, city?.latitude, city?.longitude]);

  // Default the order type to whatever the shop actually allows.
  useEffect(() => {
    if (!doorstepAllowed && pickupAllowed && checkout?.orderType !== "selfpickup") {
      dispatch(setOrderType({ data: "selfpickup" }));
    }
    if (doorstepAllowed && !pickupAllowed && checkout?.orderType !== "doorstep") {
      dispatch(setOrderType({ data: "doorstep" }));
    }
  }, [checkout?.orderType, dispatch, doorstepAllowed, pickupAllowed]);

  // Quick Delivery offers no store pickup, so a module that switches to it must
  // not leave the customer on a self-pickup order.
  useEffect(() => {
    if (isQuickCheckout && checkout?.orderType != "doorstep") {
      dispatch(setOrderType({ data: "doorstep" }));
    }
  }, [checkout?.orderType, dispatch, isQuickCheckout]);

  // §1.3: the discount and the new total only come back on the charges call, so
  // refetch it whenever the cart, the promo, the address, the mode or the slot
  // changes.
  useEffect(() => {
    if (!showCart || loading) return;
    fetchCharges();
    // fetchCharges is omitted on purpose: it is rebuilt whenever any of these
    // change, which would make this effect fire twice per change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showCart,
    loading,
    cart?.cartProducts,
    cart?.promo_code?.promo_code_id,
    checkout?.address?.id,
    checkout?.orderType,
    checkout?.timeSlot?.id,
  ]);

  useEffect(() => {
    filterTimeSlots(timeSlots, checkout?.selectedDate);
  }, [checkout?.selectedDate, filterTimeSlots, timeSlots]);

  // Preselect the first bookable day, so a fresh checkout is not blocked on the
  // "pick a date" guard with nothing the customer did wrong.
  useEffect(() => {
    if (!showCart || checkout?.selectedDate) return;
    if (!isTimeSlotsEnabled(timeSlotsData) || isQuickCheckout) return;
    const first = new Date();
    first.setDate(first.getDate() + (estimateDays > 1 ? estimateDays - 1 : 0));
    dispatch(setSelectedDate({ data: first.toISOString() }));
  }, [showCart, checkout?.selectedDate, timeSlotsData, isQuickCheckout, estimateDays, dispatch]);

  // ── Row actions ───────────────────────────────────────────────────────────

  const afterCartChange = useCallback(async () => {
    await refreshCart();
    await fetchCharges();
  }, [fetchCharges, refreshCart]);

  const promptLogin = useCallback(() => {
    setShowLogin(true);
  }, []);

  const { remove, moveToFavorites, unfavorite, busyRowKey, rowKey } = useCartRowActions({
    onChanged: async () => {
      await afterCartChange();
      await fetchFavorites();
    },
    onLoginRequired: promptLogin,
  });

  /**
   * The heart has to answer the tap, not the round trip.
   *
   * `favoriteProductIds` comes from the favourites endpoint, so waiting for
   * add → remove → re-read left the heart lit for a second or more — long
   * enough to read as "nothing happened". The set is corrected either way when
   * `onChanged` re-reads it.
   */
  const setFavoriteLocally = (productId: Id | undefined, favorite: boolean) =>
    setFavoriteProductIds((previous) => {
      const next = new Set(previous);
      if (favorite) next.add(String(productId));
      else next.delete(String(productId));
      return next;
    });

  const handleUnfavorite = async (row: ApiCartItem) => {
    setFavoriteLocally(row?.product_id, false);
    await unfavorite(row);
  };

  const handleMoveToFavorites = async (row: ApiCartItem) => {
    setFavoriteLocally(row?.product_id, true);
    await moveToFavorites(row);
  };

  /** Clear All (§1.5). Guests drop the lines locally; the endpoint is for account carts. */
  const clearUnavailable = async () => {
    setClearingUnavailable(true);
    try {
      if (cart?.isGuest) {
        const deadVariantIds = new Set(
          unavailable.map((row) => String(row?.product_variant_id))
        );
        const lines = (cart?.guestCart || []).filter(
          (line) => !deadVariantIds.has(String(line?.product_variant_id))
        );
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
        await refreshCart();
        return;
      }
      const response = await api.clearUnavailableCartItems();
      if (response?.status != 1) {
        toast.error(response?.message || t("something_went_wrong"));
        return;
      }
      // The reply is only an acknowledgement — re-read the cart for the truth.
      await afterCartChange();
    } catch (error) {
      console.log("Error", error);
    } finally {
      setClearingUnavailable(false);
    }
  };

  const openProduct = (row: ApiCartItem) => {
    if (!row?.slug) return;
    onClose();
    router.push(`/product/${row.slug}`);
  };

  // ── Coupons ───────────────────────────────────────────────────────────────

  /** Returns the server's message when the code is refused, else null. */
  const applyCoupon = async (code: string) => {
    try {
      const response = await api.setPromoCode({
        promoCodeName: code,
        amount: cart?.cartSubTotal as number,
      });
      if (response.status == 1) {
        dispatch(setCartPromo({ data: response.data }));
        return null;
      }
      return response?.message || t("invalid_promo_code");
    } catch (error) {
      console.log("Error", error);
      return t("something_went_wrong");
    }
  };

  // ── Wallet ────────────────────────────────────────────────────────────────

  const toggleWallet = () => {
    const next = !checkout?.isWalletChecked;
    dispatch(setWalletChecked({ data: next }));
    if (next) {
      dispatch(setUserWalletBalance({ data: Math.min(walletBalance, orderTotal) }));
      // A wallet that settles the whole order IS the payment method.
      if (walletCoversOrder(orderTotal, walletBalance)) {
        dispatch(setPaymentMethod({ data: "wallet" }));
      }
    } else {
      dispatch(setUserWalletBalance({ data: 0 }));
      if (checkout?.selectedPaymentMethod === "wallet") {
        dispatch(setPaymentMethod({ data: null }));
      }
    }
  };

  const openTopUp = (amount: number) => {
    setTopUpAmount(amount);
    setShowWalletTopUp(true);
  };

  const afterTopUp = async () => {
    setShowWalletTopUp(false);
    setTopUpAmount(null);
    setToppedUp(true);
    await fetchUser();
    await fetchCharges();
  };

  // §1.7: on return from recharge, tick the wallet automatically IF the balance
  // now covers the total. Only then — a customer who merely happens to have a
  // big balance still opts in with the checkbox.
  useEffect(() => {
    if (!toppedUp || showWalletTopUp) return;
    if (!walletCoversOrder(orderTotal, walletBalance)) return;
    setToppedUp(false);
    if (checkout?.isWalletChecked) return;
    dispatch(setWalletChecked({ data: true }));
    dispatch(setUserWalletBalance({ data: orderTotal }));
    dispatch(setPaymentMethod({ data: "wallet" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toppedUp, showWalletTopUp, walletBalance, orderTotal]);

  // ── Place Order ───────────────────────────────────────────────────────────

  /**
   * §1.4, in this order. Each failure shows its message and stops. Returns
   * false when the order must not be placed.
   */
  const passesGuards = () => {
    if (uncoveredRx.length > 0) {
      toast.error(t("attach_prescription_for_required"));
      return false;
    }
    if (unavailable.length > 0) {
      toast.error(t("items_sold_out_remove_message"));
      return false;
    }
    if (!isPickup && !checkout?.address) {
      // Guard 3 opens the picker rather than printing a message.
      setShowAddressPicker(true);
      return false;
    }
    if (!isPickup && checkOutError) {
      toast.error(checkOutErrorMsg || t("not_delivering_selected_address"));
      return false;
    }
    if (!isPickup && isTimeSlotsEnabled(timeSlotsData) && !isQuickCheckout) {
      if (!checkout?.selectedDate) {
        toast.error(t("please_select_date"));
        return false;
      }
      if (!availableTimeSlots.some((slot) => slot.isDisabled != true)) {
        toast.error(t("all_timeslots_over"));
        return false;
      }
      if (!checkout?.timeSlot) {
        toast.error(t("please_select_time_slot"));
        return false;
      }
    }
    if (!checkout?.selectedPaymentMethod && !walletCovers) {
      toast.error(t("payment_methods_not_available"));
      return false;
    }
    return true;
  };

  /**
   * `place_order`'s `delivery_time`.
   *
   * Deliberately the format the old checkout page sent — zero-padded
   * `dd-mm-yyyy`, plus the slot title when one is chosen, and the estimate date
   * (today + `delivery_estimate_days`) when time slots are off. The spec's
   * §2.1 describes the app, which sends `d-M-yyyy` and the literal `"N/A"`
   * with slots off; adopting that would change what every live shop stores for
   * an order on no evidence that the backend parses both. The one thing taken
   * from §2.1 is the title fallback: `default_title`, else the translated
   * title, skipping the literal string `"null"`.
   */
  const deliveryTimeParam = () => {
    const pad = (value: number) => String(value).padStart(2, "0");
    const stamp = (date: Date) =>
      `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;

    if (!isTimeSlotsEnabled(timeSlotsData)) {
      const estimate = new Date();
      estimate.setDate(estimate.getDate() + estimateDays);
      return stamp(estimate);
    }
    // No date picked (self-pickup, Quick Delivery): today, not new Date(null)
    // — that is the Unix epoch, which used to send "01-01-1970".
    const date = checkout?.selectedDate ? new Date(checkout.selectedDate) : new Date();
    const slot = checkout?.timeSlot;
    const rawTitle = slot?.default_title ?? slot?.translations?.title;
    const title = rawTitle && String(rawTitle) !== "null" ? String(rawTitle) : "";
    return title ? `${stamp(date)} ${title}` : stamp(date);
  };

  const handlePlaceOrder = async () => {
    if (!signedIn) {
      toast.error(t("required_login_message_for_checkout"));
      promptLogin();
      return;
    }
    if (!passesGuards()) return;

    const method = walletCovers ? "wallet" : (checkout?.selectedPaymentMethod as PaymentMethod);
    const capitalizedMethod =
      method === "dpo" ? "DPO" : String(method).charAt(0).toUpperCase() + String(method).slice(1);
    const status = method === "COD" || method === "wallet" ? 2 : 1;

    try {
      setPlacing(true);
      const response = await api.placeOrder({
        productVariantId: cart?.checkout?.product_variant_id,
        quantity: cart?.checkout?.quantity,
        total: cart?.checkout?.sub_total,
        deliveryCharge: cart?.checkout?.delivery_charge?.total_delivery_charge,
        finalTotal: amountDue,
        walletUsed: checkout?.isWalletChecked,
        walletBalance: walletUsed,
        addressId: checkout?.address?.id,
        deliveryTime: deliveryTimeParam(),
        orderNote: checkout?.orderNote,
        paymentMethod: method,
        promocodeId: cart?.promo_code?.promo_code_id,
        status,
        order_type: checkout?.orderType,
        prescriptionGroups: checkout?.prescriptionGroups?.map((group) => ({
          productVariantIds: group.productIds,
          images: group.images?.map((image) => image.file),
        })),
      });
      setPlacing(false);
      if (response?.status != 1) {
        toast.error(response?.message);
        return;
      }
      dispatch(setOrderNote({ data: "" }));
      await startTransaction(method, response?.data?.order_id, capitalizedMethod);
    } catch (error) {
      setPlacing(false);
      console.log("Error", error);
    }
  };

  /**
   * A settled order goes to /web-payment-status. The cart is emptied first,
   * so the success page never shows the order's items still in the cart.
   * COD and wallet never send order_id (place_order does not return one for
   * them); gateway successes (Razorpay, Paystack) do.
   */
  const onOrderSettled = (paymentMethod?: string | null, orderId?: Id) => {
    void clearPlacedOrderCart(dispatch);
    onClose();
    router.push(
      `/web-payment-status?status=success&type=order&payment_method=${paymentMethod}` +
        (orderId != null ? `&order_id=${orderId}` : ""),
    );
  };

  const startTransaction = async (
    method: PaymentMethod,
    orderId?: Id,
    capitalizedMethod?: string
  ) => {
    try {
      // No gateway needed — straight to the success page, as before.
      if (method === "COD" || method === "wallet") {
        onOrderSettled(method);
        return;
      }
      if (method === "paystack") {
        await handlePayStackPayment(orderId, amountDue, capitalizedMethod as string);
        return;
      }
      const response = await api.initiateTrasaction({
        orderId,
        paymentMethod: capitalizedMethod as string,
        type: "order",
      });
      if (response.status != 1) {
        await api.deleteOrder({ orderId });
        toast.error(response?.message);
        return;
      }
      if (method === "phonepe") {
        dispatch(setPhonePeCheckoutDetails(response?.data));
      }
      if (method === "razorpay") {
        handleRazorpayPayment(
          orderId,
          response?.data?.transaction_id,
          amountDue,
          capitalizedMethod as string
        );
        return;
      }
      if (method === "stripe") {
        setStripeOrderId(orderId);
        setStripeClientSecret(response?.data?.client_secret);
        setStripeTransactionId(response?.data?.id);
        setShowStripe(true);
        return;
      }
      dispatch(clearCartPromo());
      // These gateways leave the site, which is exactly why
      // /web-payment-status has to stay a real page.
      const redirectUrls: Partial<Record<PaymentMethod, string | undefined>> = {
        cashfree: response?.data?.redirectUrl,
        phonepe: response?.data?.redirectUrl,
        paytabs: response?.data?.redirectUrl,
        paypal: response?.data?.paypal_redirect_url,
        midtrans: response?.data?.snapUrl,
        dpo: response?.data?.redirectUrl,
      };
      const redirectUrl = redirectUrls[method];
      if (redirectUrl) {
        onClose();
        router.push(redirectUrl);
      } else {
        console.error("Unsupported payment method:", method);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const initializeRazorpay = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleRazorpayPayment = async (
    orderId: Id | undefined,
    razorpayTransactionId: string | undefined,
    amount: number,
    capitalizedMethod: string
  ) => {
    try {
      const loaded = await initializeRazorpay();
      if (!loaded) {
        console.error("RazorPay SDK Load Failed");
        return;
      }
      const options = {
        key: setting?.payment_setting?.razorpay_key,
        amount: Math.floor(amount * 100),
        currency: "INR",
        name: user?.user?.name,
        description: setting?.setting?.app_name,
        image: setting?.setting?.web_settings!.web_logo,
        order_id: razorpayTransactionId,
        handler: async (res: RazorpaySuccessResponse) => {
          if (!res.razorpay_payment_id) return;
          try {
            setPaymentLoading(true);
            const response = await api.addTransaction({
              orderId,
              transactionId: res.razorpay_payment_id,
              paymentMethod: capitalizedMethod,
              type: "order",
              razorpay: res,
            });
            setPaymentLoading(false);
            if (response.status === 1) {
              onOrderSettled(checkout?.selectedPaymentMethod, orderId);
              return;
            }
            toast.error(response.message);
          } catch (error) {
            console.error("Transaction error:", error);
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: async (reason: unknown) => {
            if (reason === undefined) await api.deleteOrder({ orderId });
          },
        },
        prefill: {
          name: user?.user?.name,
          email: user?.user?.email,
          contact: user?.user?.mobile,
        },
        notes: { address: "Razorpay Corporate" },
        theme: { color: setting?.setting?.web_settings!.color },
      };
      const rzpay = new window.Razorpay(options);
      rzpay.on("payment.cancel", () => api.deleteOrder({ orderId }));
      rzpay.on("payment.failed", () => api.deleteOrder({ orderId }));
      rzpay.open();
    } catch (error) {
      console.error("Error initializing Razorpay:", error);
    }
  };

  const handlePayStackPayment = async (
    orderId: Id | undefined,
    amount: number,
    capitalizedMethod: string
  ) => {
    try {
      // Imported here, not at the top: @paystack/inline-js reads `window` while
      // the module evaluates, and this drawer is pulled in statically by the
      // header — which renders on the server.
      const { default: PaystackPop } = await import("@paystack/inline-js");
      const handler = PaystackPop.setup({
        key: setting?.payment_setting?.paystack_public_key,
        email: user?.user?.email,
        amount: parseFloat(amount as unknown as string) * 100,
        currency: setting?.payment_setting?.paystack_currency_code,
        ref: new Date().getTime().toString(),
        label: setting?.setting?.support_email,
        onClose: () => {
          api.deleteOrder({ orderId });
        },
        callback: async (res) => {
          try {
            setPaymentLoading(true);
            const response = await api.addTransaction({
              orderId,
              transactionId: res.reference,
              paymentMethod: capitalizedMethod,
              type: "order",
            });
            setPaymentLoading(false);
            if (response.status == 1) {
              onOrderSettled(checkout?.selectedPaymentMethod, orderId);
              return;
            }
            toast.error(response.message);
          } catch (error) {
            console.log("Error", error);
          }
        },
      });
      handler.openIframe();
    } catch (error) {
      console.log("Paystack Error", error);
    }
  };

  // ── Labels ────────────────────────────────────────────────────────────────

  const slotSummaryLabel = () => {
    if (isQuickCheckout) {
      return formatSlotDuration(quickSlot?.duration_minutes, {
        minute: t("minutes"),
        hour: t("hours"),
      });
    }
    const slotTitle =
      checkout?.timeSlot?.translations?.title || checkout?.timeSlot?.default_title || "";
    if (!checkout?.selectedDate) return slotTitle || t("choose_date");
    const date = new Date(checkout.selectedDate);
    const isToday = new Date().toDateString() === date.toDateString();
    const dayLabel = isToday
      ? t("today")
      : date.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    return slotTitle ? `${dayLabel} · ${slotTitle}` : dayLabel;
  };

  /**
   * Any sub-flow open above the drawer. Radix puts each modal in its own
   * portal, so a click inside one counts as "outside" the sheet — without this
   * guard, using the slot picker would close the whole drawer.
   */
  const subFlowOpen =
    showClearConfirm ||
    showLogin ||
    showAddressPicker ||
    showAddressForm ||
    showSlotModal ||
    showCouponModal ||
    showWalletTopUp ||
    showStripe ||
    Boolean(replaceRow) ||
    Boolean(variantRow);

  /**
   * Empty the whole cart after a confirm. Server cart: the same deleteCart call
   * (cart/remove with is_remove_all) and store reset the success page uses.
   * Guest cart: it only lives in the store, so clearing it there is enough.
   */
  const handleClearCart = async () => {
    setClearing(true);
    try {
      if (cart?.isGuest) {
        dispatch(addtoGuestCart({ data: [] }));
        dispatch(setGuestCartTotal({ data: 0 }));
      } else {
        const response = await api.deleteCart();
        if (response.status != 1) {
          toast.error(response?.message || t("something_went_wrong"));
          return;
        }
        dispatch(setCart({ data: [] }));
        dispatch(setCartProducts({ data: [] }));
      }
      dispatch(setCartSubTotal({ data: 0 }));
      dispatch(clearCartPromo());
      setShowClearConfirm(false);
      await refreshCart();
    } catch (error) {
      console.log("Error", error);
      toast.error(t("something_went_wrong"));
    } finally {
      setClearing(false);
    }
  };

  const handleRequestClose = () => {
    if (paymentInFlight) {
      toast.error(t("cannot_go_back_during_payment"));
      return;
    }
    onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  /**
   * Everything standing between this cart and an order, in the order §1.4
   * checks them. The footer shows the first one and disables Place Order, so
   * the customer is told what to fix instead of being handed a toast after a
   * click that was never going to work.
   *
   * Signed-out customers get none of these: their button says "Login to
   * checkout" and has to stay clickable. A pharmacy guest in particular cannot
   * upload a prescription until after they log in.
   */
  const blockers: { message: string; onFix?: () => void }[] = [];
  if (unavailable.length > 0) {
    blockers.push({ message: t("items_sold_out_remove_message") });
  }
  if (signedIn) {
    if (uncoveredRx.length > 0) {
      blockers.push({ message: t("upload_prescription_to_place_order") });
    }
    if (!isPickup && !checkout?.address) {
      blockers.push({
        message: t("please_select_address"),
        onFix: () => setShowAddressPicker(true),
      });
    }
    if (!isPickup && checkOutError) {
      blockers.push({
        message: checkOutErrorMsg || t("not_delivering_selected_address"),
      });
    }
    if (!isPickup && isTimeSlotsEnabled(timeSlotsData) && !isQuickCheckout) {
      if (!checkout?.selectedDate) {
        blockers.push({
          message: t("please_select_date"),
          onFix: () => setShowSlotModal(true),
        });
      } else if (!availableTimeSlots.some((slot) => slot.isDisabled != true)) {
        blockers.push({ message: t("all_timeslots_over"), onFix: () => setShowSlotModal(true) });
      } else if (!checkout?.timeSlot) {
        blockers.push({
          message: t("please_select_time_slot"),
          onFix: () => setShowSlotModal(true),
        });
      }
    }
    if (!checkout?.selectedPaymentMethod && !walletCovers) {
      blockers.push({
        message: t("please_select_payment_method"),
        onFix: () => setPaymentOpen(true),
      });
    }
  }

  // Also disabled while charges recalculate — the total on screen is stale (§1.7).
  const placeOrderBlocked =
    rows.length === 0 ||
    cartLoadError !== null ||
    paymentInFlight ||
    chargesLoading ||
    (signedIn && blockers.length > 0) ||
    unavailable.length > 0;

  const body = () => {
    if (loading) return <CartDrawerSkeletons />;

    // The cart could not be read, which is not the same as empty: show why and
    // let the customer retry rather than inviting them to "Shop Now".
    if (cartLoadError !== null) {
      return (
        <div className="mx-10 flex h-full items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <h1 className="py-2 text-center text-[22px] font-bold text-[var(--foreground-primary)]">
              {t("something_went_wrong")}
            </h1>
            <p className="text-center text-xs font-bold text-[var(--foreground-tertiary)]">
              {cartLoadError}
            </p>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                await refreshCart();
                setLoading(false);
              }}
              className="rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2 text-base font-medium text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
            >
              {t("try_again")}
            </button>
          </div>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="mx-10 flex h-full items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <Image
              src={NoCartData}
              alt={t("empty_cart_list_message")}
              width={512}
              height={325}
              sizes="(max-width: 768px) 240px, 320px"
              className="object-contain"
            />
            <h1 className="py-2 text-center text-[22px] font-bold text-[var(--foreground-primary)]">
              {t("empty_cart_list_message")}
            </h1>
            <p className="text-center text-xs font-bold text-[var(--foreground-tertiary)]">
              {t("empty_cart_list_description")}
            </p>
            <button
              type="button"
              onClick={() => {
                dispatch(setListingSource({ data: "all" }));
                onClose();
                router.push("/products");
              }}
              className="rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2 text-base font-medium text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
            >
              {t("shop_now")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-5">
          {/* Delivery / Pickup */}
          <DrawerSection>
            {showModeTabs && (
              <DeliveryModeTabs
                value={checkout?.orderType}
                onChange={(mode) => dispatch(setOrderType({ data: mode }))}
                doorstepAllowed={doorstepAllowed}
                pickupAllowed={pickupAllowed}
                onBlocked={(mode: OrderType) =>
                  toast.error(
                    mode === "doorstep"
                      ? t("doorStepDeliveryDisableNote")
                      : t("selfPickUpDisabledNote")
                  )
                }
              />
            )}
            {signedIn ? (
              <CheckoutAddressHeader
                orderType={checkout?.orderType}
                address={checkout?.address}
                pickup={checkoutData?.seller_self_pickup}
                onEdit={() => setShowAddressPicker(true)}
                onAdd={() => {
                  setIsAddressSelected(false);
                  setShowAddressForm(true);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={promptLogin}
                className="flex w-full items-center gap-3 rounded-xl bg-[var(--surface-subtle)] px-4 py-3.5 text-left"
              >
                <BiEditAlt size={16} className="flex-shrink-0 text-[var(--brand-foreground-default)]" />
                <span className="flex-1 text-[13.5px] font-semibold text-[var(--foreground-primary)]">
                  {t("login_to_checkout")}
                </span>
                <MdChevronRight size={18} className="text-[var(--foreground-tertiary)]" />
              </button>
            )}
          </DrawerSection>

          {isQuickCheckout && (
            <DrawerSection>
              <QuickDeliveryCard slot={quickSlot} itemCount={shipmentUnits} />
            </DrawerSection>
          )}

          <UnavailableItemsCard
            rows={unavailable}
            favoriteProductIds={favoriteProductIds}
            onReplace={setReplaceRow}
            onRemove={remove}
            onClearAll={clearUnavailable}
            onMoveToFavorites={handleMoveToFavorites}
            onUnfavorite={handleUnfavorite}
            clearing={clearingUnavailable}
            busyRowKey={busyRowKey}
            rowKey={rowKey}
          />

          {/* Items */}
          <DrawerSection
            title={t("your_items")}
            icon={<IoBagHandleOutline size={16} />}
            trailing={
              <span className="text-xs font-bold text-[var(--foreground-tertiary)]">
                {`${t("shipment_of")} ${shipmentUnits}`}
              </span>
            }
          >
            <div className="flex flex-col">
              {available.map((row) => (
                <CheckoutItemRow
                  key={rowKey(row)}
                  row={row}
                  isFavorite={favoriteProductIds.has(String(row?.product_id))}
                  showRxChip={showRxChip}
                  busy={busyRowKey === rowKey(row)}
                  onEditVariant={setVariantRow}
                  onMoveToFavorites={handleMoveToFavorites}
                  onUnfavorite={handleUnfavorite}
                  onRemove={remove}
                  onOpenProduct={openProduct}
                />
              ))}
            </div>
          </DrawerSection>

          {/* Prescriptions */}
          {showRxChip && (
            <DrawerSection>
              <PrescriptionRequiredPanel cartProductsData={rows} compact />
            </DrawerSection>
          )}

          {/* Preferred delivery */}
          {signedIn &&
            !isPickup &&
            showsDeliverySchedule(timeSlotsData) &&
            !isQuickDelivery(timeSlots) && (
              <DrawerSection
                title={t("preferred_day_and_time")}
                icon={<MdOutlineWatchLater size={16} />}
              >
                <button
                  type="button"
                  onClick={() => setShowSlotModal(true)}
                  className="flex w-full items-center gap-3 rounded-xl bg-[var(--surface-subtle)] px-4 py-3 text-left outline outline-1 -outline-offset-1 outline-[var(--border-default)]"
                >
                  <MdOutlineWatchLater
                    size={16}
                    className="flex-shrink-0 text-[var(--brand-foreground-default)]"
                  />
                  <span className="flex-1 truncate text-[13px] font-bold text-[var(--foreground-secondary)]">
                    {t("deliver_on")}{" "}
                    <span className="font-extrabold text-[var(--foreground-primary)]">
                      {slotSummaryLabel()}
                    </span>
                  </span>
                  <MdChevronRight size={18} className="text-[var(--foreground-secondary)]" />
                </button>
              </DrawerSection>
            )}

          {/* Instructions */}
          {signedIn && (
            <DrawerSection>
              <button
                type="button"
                onClick={() => setShowNote(!showNote)}
                className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--button-link-foreground-default)]"
              >
                <BiEditAlt size={14} />
                {showNote ? t("hide_delivery_instructions") : t("add_delivery_instructions")}
              </button>
              {showNote && (
                <textarea
                  value={checkout?.orderNote ?? ""}
                  onChange={(event) => dispatch(setOrderNote({ data: event.target.value }))}
                  placeholder={t("order_note")}
                  maxLength={256}
                  className="mt-2.5 min-h-16 w-full resize-y rounded-lg bg-[var(--form-default-background)] px-3 py-2.5 text-[13px] text-[var(--form-default-text)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] placeholder:text-[var(--form-default-placeholder)] focus:outline-[var(--form-focus-filled-border)]"
                />
              )}
            </DrawerSection>
          )}

          {/* Offers */}
          {signedIn && (
            <DrawerSection title={t("offers")} icon={<RiCoupon3Line size={16} />}>
              {cart?.promo_code ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-[var(--status-success-background)] px-3.5 py-3 outline outline-1 -outline-offset-1 outline-[var(--status-success-foreground)]">
                  <button
                    type="button"
                    onClick={() => setShowCouponModal(true)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--status-success-foreground)] text-[var(--foreground-inverse)]">
                      <RiCoupon3Line size={16} />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <b className="truncate text-[13.5px] font-extrabold tracking-wide text-[var(--status-success-foreground)]">
                        {cart?.promo_code?.promo_code}
                      </b>
                      <span className="truncate text-[12.5px] text-[var(--status-success-foreground)]">
                        {`${t("you_are_saving")} ${currency}${formatAmount(
                          cart?.promo_code?.discount,
                          decimals
                        )}`}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch(clearCartPromo())}
                    className="flex-shrink-0 rounded-full bg-[var(--surface-default)] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground-secondary)] outline outline-1 -outline-offset-1 outline-[var(--border-default)]"
                  >
                    {t("delete")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCouponModal(true)}
                  className="flex w-full items-center gap-3 rounded-xl bg-[var(--brand-background-subtle)] px-3.5 py-3 text-left outline outline-1 -outline-offset-1 outline-dashed outline-[var(--brand-foreground-default)]"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-default)] text-[var(--brand-foreground-default)]">
                    <RiCoupon3Line size={18} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="text-[13.5px] font-extrabold text-[var(--foreground-primary)]">
                      {t("apply_coupon")}
                    </b>
                    <span className="truncate text-xs text-[var(--foreground-secondary)]">
                      {t("view_all_offers")}
                    </span>
                  </span>
                  <MdChevronRight size={18} className="text-[var(--brand-foreground-default)]" />
                </button>
              )}
            </DrawerSection>
          )}

          {/* Bill */}
          <DrawerSection>
            <BillDetailsCard
              checkoutData={checkoutData}
              hasError={checkOutError || !signedIn}
              fallbackSubTotal={Number(cart?.cartSubTotal ?? 0)}
              orderType={checkout?.orderType}
              walletUsed={walletUsed}
              payable={amountDue}
            />
          </DrawerSection>

          {/* Payment */}
          {signedIn && (
            <DrawerSection title={t("payment_method")} icon={<MdOutlinePayment size={16} />}>
              <PaymentAccordion
                total={orderTotal}
                walletBalance={walletBalance}
                walletChecked={Boolean(checkout?.isWalletChecked)}
                walletCovers={walletCovers}
                onToggleWallet={toggleWallet}
                onTopUp={openTopUp}
                method={checkout?.selectedPaymentMethod}
                onSelectMethod={(method) => dispatch(setPaymentMethod({ data: method }))}
                codAllowed={codAllowed}
                isPickup={isPickup}
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
              />
            </DrawerSection>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 border-t border-[var(--border-default)] bg-[var(--surface-default)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-[var(--foreground-tertiary)]">
              {t("total")}
            </span>
            <span className="text-[21px] font-extrabold text-[var(--foreground-primary)]">
              {currency}
              {formatAmount(footerTotal, decimals)}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={placeOrderBlocked}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--button-primary-background-default)] py-3.5 text-[15px] font-extrabold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:cursor-not-allowed disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-foreground-disabled)]"
          >
            {signedIn ? t("place_order") : t("login_to_checkout")}
            <MdChevronRight size={18} />
          </button>
          {blockers[0] &&
            (blockers[0].onFix ? (
              <button
                type="button"
                onClick={blockers[0].onFix}
                className="mt-2 flex w-full items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[var(--status-error-default)] underline decoration-dotted underline-offset-2"
              >
                <FiAlertCircle size={13} />
                {blockers[0].message}
              </button>
            ) : (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[var(--status-error-default)]">
                <FiAlertCircle size={13} />
                {blockers[0].message}
              </p>
            ))}
        </div>
      </>
    );
  };

  return (
    <>
      <Sheet
        open={showCart}
        onOpenChange={(open) => {
          if (!open && !subFlowOpen) handleRequestClose();
        }}
      >
        <SheetContent
          side={language?.type == "RTL" ? "left" : "right"}
          className="flex h-dvh w-full flex-col p-0 sm:max-w-[440px]"
        >
          <SheetHeader className="flex-shrink-0 border-b border-[var(--border-subtle)] px-0 py-0 text-left">
            <SheetTitle className="flex flex-row items-center justify-between p-5">
              <span className="flex flex-col">
                <span className="text-[19px] font-extrabold text-[var(--foreground-primary)]">
                  {t("shoppingCart")}
                </span>
                <span className="mt-0.5 text-[12.5px] font-medium text-[var(--foreground-tertiary)]">
                  {cartLoadError !== null
                    ? t("something_went_wrong")
                    : rows.length
                    ? `${shipmentUnits} ${
                        shipmentUnits === 1 ? t("item") : t("items").toLowerCase()
                      }`
                    : t("empty_cart_list_message")}
                </span>
              </span>
              <span className="flex items-center gap-3">
                {rows.length > 0 && cartLoadError === null && !paymentInFlight && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-[13px] font-bold text-[var(--status-error-foreground)] hover:underline"
                  >
                    {t("clear_all")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRequestClose}
                  aria-label={t("close")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--foreground-secondary)]"
                >
                  <RiCloseFill size={20} />
                </button>
              </span>
            </SheetTitle>
          </SheetHeader>

          {body()}
        </SheetContent>
      </Sheet>

      {showLogin && (
        <Login
          showLogin={showLogin}
          setShowLogin={setShowLogin}
          setMobileActiveKey={setMobileActiveKey}
        />
      )}

      <AddressPickerModal
        open={showAddressPicker}
        // The picker can edit or delete the held address, so a plain close
        // reprices — always (§1.3).
        onClose={async () => {
          setShowAddressPicker(false);
          await fetchAddresses();
          await fetchCharges();
        }}
        fetchAddress={fetchAddresses}
        setShowAddressForm={setShowAddressForm}
        setIsAddressSelected={setIsAddressSelected}
      />

      {showAddressForm && (
        <NewAddressModal
          showAddAddres={showAddressForm}
          setShowAddAddres={(value) => {
            const next = typeof value === "function" ? value(showAddressForm) : value;
            setShowAddressForm(next);
            // Closing the form reprices: the address it saved may be the held one.
            if (!next) fetchCharges();
          }}
          isAddressSelected={isAddressSelected}
          fetchAddress={fetchAddresses}
        />
      )}

      <PreferredDeliveryModal
        open={showSlotModal}
        onClose={() => setShowSlotModal(false)}
        slots={availableTimeSlots}
        selectedDate={checkout?.selectedDate}
        selectedSlot={checkout?.timeSlot}
        estimateDays={estimateDays}
        allowedDays={allowedDays}
        onSelectDate={(date) => {
          dispatch(setSelectedDate({ data: date.toISOString() }));
          dispatch(setTimeSlot({ data: null }));
          filterTimeSlots(timeSlots, date);
        }}
        onSelectSlot={(slot) => dispatch(setTimeSlot({ data: slot }))}
      />

      <CouponModal
        open={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        subTotal={Number(cart?.cartSubTotal ?? 0)}
        applied={cart?.promo_code}
        onApply={applyCoupon}
        onRemove={() => dispatch(clearCartPromo())}
      />

      <GuestCartConflictModal
        open={Boolean(conflictLines?.length)}
        count={conflictLines?.length ?? 0}
        busy={merging}
        onAnswer={resolveSellerConflict}
      />

      <Dialog open={showClearConfirm} onOpenChange={(open) => !clearing && setShowClearConfirm(open)}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogTitle className="text-lg font-extrabold text-[var(--foreground-primary)]">
            {t("clear_all")}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--foreground-secondary)]">
            {t("clear_cart_warning")}
          </DialogDescription>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              disabled={clearing}
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-[var(--button-outline-foreground-default)] outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] disabled:opacity-60"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={clearing}
              onClick={handleClearCart}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:opacity-60"
            >
              {t("yes")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ReplaceItemModal
        row={replaceRow}
        onClose={() => setReplaceRow(null)}
        onSwapped={afterCartChange}
      />

      <ChooseVariantModal
        row={variantRow}
        onClose={() => setVariantRow(null)}
        onSwapped={afterCartChange}
      />

      {showWalletTopUp && (
        <WalletBalanceModal
          addWalletModal={showWalletTopUp}
          setAddWalletModal={(open) => {
            if (!open) afterTopUp();
            else setShowWalletTopUp(true);
          }}
          prefillAmount={topUpAmount}
        />
      )}

      {showStripe && (
        <StripeModal
          showStripe={showStripe}
          setShowStripe={setShowStripe}
          amount={amountDue}
          clientSecret={stripeClientSecret}
          stripeTransId={stripeTransactionId}
          stripeOrderId={stripeOrderId}
          type="order"
        />
      )}
    </>
  );
};

export default CartDrawer;
