// Orders (`api.getOrders()` items — list and detail share one shape), live
// tracking, and the two `api.getUserTransactions()` feeds.

import type { DateString, Flag, Id, Numeric, Nullable, Url } from "../common";
import type { OrderType } from "./checkout";

/**
 * One entry of `order.status`: `[statusCode, timestamp]`.
 * Codes: 1 payment pending, 2 received, 3 processed, 4 shipped, 5 out for
 * delivery, 6 delivered, 7 cancelled, 8 returned, 9 received, 10 ready to
 * pickup, 11 picked (OrderStatusStepper.jsx).
 */
export type OrderStatusHistoryEntry = [statusCode: Numeric, timestamp: DateString];

/** Store the customer collects a self-pickup order from (`order.pickup_address`). */
export interface PickupAddress {
  seller_name?: string;
  seller_mobile?: string;
  pickup_store_address?: string;
  pickup_latitude?: Numeric;
  pickup_longitude?: Numeric;
  opening_time?: string;
  closing_time?: string;
}

/** Extra line on the bill (`order.additional_charges`). */
export interface OrderAdditionalCharge {
  title?: string;
  amount?: Numeric;
  /** Truthy check only. */
  is_refundable?: Flag;
}

/** Add-on picked for an order line; read through `getAddonName` (addonUtils.js). */
export interface OrderItemAddon {
  name?: string;
  translations?: { name?: string };
}

/** A rating the customer left on an order line (`item.item_rating`). */
export interface OrderItemRating {
  id: Id;
  user_id?: Id;
  user?: { id: Id };
  /** Star count, shown on the "edit review" chip (OrderItems). */
  rate?: number;
}

export interface OrderItem {
  /** Order-item id (sent as `orderItemId` when cancelling/returning). */
  id: Id;
  order_id?: Id;
  product_id?: Id;
  product_variant_id?: Id;
  /** Used by re-order (`addToBulkCart` variant_ids). */
  variant_id?: Id;
  name?: string;
  variant_name?: string;
  image_url?: Url;
  quantity?: Numeric;
  price?: Numeric;
  discounted_price?: Numeric;
  /** Per-unit add-on total, added to the price by `getCartLineUnitPrice`. */
  addon_price?: Numeric;
  selected_addons?: OrderItemAddon[];
  /** Item-level status code (same codes as `OrderStatusHistoryEntry`). */
  active_status?: Numeric;
  /** Highest status at which the item may still be cancelled. */
  till_status?: Numeric;
  /** `1` = cancellable. */
  cancelable_status?: Flag;
  /** `1` = returnable. */
  return_status?: Flag;
  /**
   * `null` = no return requested. Otherwise a return-state code:
   * 1 requested, 3 rejected, 4 delivery boy assigned, 5 out for pickup,
   * 6 received from customer, 7 cancelled by delivery boy, 8 returned to seller.
   */
  return_requested?: Nullable<Numeric>;
  /** Seller note shown when `return_requested` is 3. */
  return_remarks?: string;
  cancellation_reason?: string;
  refund_amount?: Numeric;
  item_rating?: OrderItemRating[];
  /** Prescription image URLs uploaded for this line. */
  prescriptions?: Url[];
}

export interface Order {
  id: Id;
  /** Display date string. */
  date?: DateString;
  order_type?: OrderType;
  /** Order-level status code; compared numerically and with `== "5"`. */
  active_status?: Numeric;
  status?: OrderStatusHistoryEntry[];
  items?: OrderItem[];
  /** Delivery OTP; hidden when `null` or `0`. */
  otp?: Nullable<Numeric>;
  order_note?: string;
  /** Payment method display name. */
  payment_method?: string;
  /** `0` when there is no gateway transaction. */
  transaction_id?: Numeric;
  final_total?: Numeric;
  remaining_total?: Numeric;
  remaining_final?: Numeric;
  delivery_charge?: Numeric;
  is_delivery_charges_refundable?: Flag;
  /** Called with `.toFixed()`, so it arrives as a number. */
  promo_discount?: number;
  /** Wallet amount used; called with `.toFixed()`. */
  wallet_balance?: number;
  additional_charges?: OrderAdditionalCharge[];
  /** Truthy when the order can be rated. Compared with `== true`. */
  product_rating?: Flag;
  /** Recipient name for doorstep orders. */
  user_name?: string;
  /** Formatted delivery address (doorstep). */
  order_address?: string;
  order_mobile?: string;
  pickup_address?: PickupAddress;
  /** Delivery address line shown in the live-tracking modal. */
  address?: string;
  /** Customer drop-off coordinates (live-tracking destination marker). */
  latitude?: Numeric;
  longitude?: Numeric;
  delivery_boy_name?: string;
  delivery_boy_mobile?: string;
  /**
   * Rider assigned to this order. "Out for delivery" is NOT the same as "a
   * rider is on it" under auto-assign (trap 9), so Track checks this: non-empty
   * and not `"0"`.
   */
  delivery_boy_id?: Nullable<Id>;
  /** ISO UTC, unlike every other date on this object (trap 5). */
  created_at?: DateString;
  /**
   * Quick Delivery only: the admin's promise for the slot, in minutes
   * (WEB_PARITY_V4.0.2 §2.2). Never sent together with `estimate_date`.
   */
  delivery_minutes?: Numeric;
  /** Fixed-window orders only. Never sent together with `delivery_minutes`. */
  estimate_date?: Nullable<string>;
  /** `"express"` marks a Quick Delivery order. */
  slot_type?: Nullable<string>;
}

/** `data` of `api.getLiveTrackingRoute()` — the rider, the drop, and the road between them. */
export interface LiveTrackingRoute {
  driver?: Nullable<{ lat?: Numeric; lng?: Numeric; tracked_at?: DateString }>;
  destination?: Nullable<{ lat?: Numeric; lng?: Numeric }>;
  route?: Nullable<{
    /** `false` is the straight-line fallback: distance and duration are 0. */
    is_road_path?: boolean;
    /** Metres. */
    distance?: number;
    /** Seconds. `0` means "no road route", NOT "arrived" (trap 7). */
    duration?: number;
    coordinates?: { lat?: Numeric; lng?: Numeric }[];
  }>;
}

/** `data` of `api.liveOrderTracking()` — the rider's current position. */
export interface LiveTracking {
  latitude?: Numeric;
  longitude?: Numeric;
}

/** Item of `api.getUserTransactions({ type: "transactions" })`. */
export interface Transaction {
  id: Id;
  created_at?: DateString;
  /** Payment method name (e.g. `"Razorpay"`, `"wallet"`); matched case-insensitively. */
  type?: string;
  /** Called with `.toFixed()`. */
  amount?: number;
  /** `"success"` renders as success; anything else as failed. */
  status?: string;
}

/** Item of `api.getUserTransactions({ type: "wallet" })`. */
export interface WalletTransaction {
  id: Id;
  created_at?: DateString;
  /** `"credit"` or `"debit"`. */
  type?: string;
  message?: string;
  /** Called with `.toFixed()`. */
  amount?: number;
}
