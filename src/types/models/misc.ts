// Smaller API models: notifications, FAQs, subscriptions, delivery time slots,
// tenant custom fields, product requests and notification (mail) settings.

import type { DateString, Flag, Id, Numeric, Nullable, Url } from "../common";

/** Item of `api.getNotifications()` `data`. */
export interface Notification {
  id: Id;
  title?: string;
  message?: string;
  image_url?: Url;
  date_sent?: DateString;
  /** Click action: `"category"`, `"product"`, `"credit"` and `"url"` are handled; others do nothing. */
  type?: string;
  /** Target id: the product for `type` "product", the category for `type` "category", the installment or application for `type` "credit" (unused: opens the credit page). */
  type_id?: Id;
  /** Opened in a new tab when `type` is `"url"`. */
  link_url?: Url;
}

/** Item of `api.getFAQs()` and `api.getSubscriptionFaqs()` `data`. */
export interface Faq {
  translations?: {
    question?: string;
    /** HTML/plain answer. */
    answer?: string;
  };
}

/** Item of `api.getSubscriptionPlans()` `data.plans`. */
export interface SubscriptionPlan {
  id: Id;
  name?: string;
  translations?: { name?: string };
  /** Plan length in days. */
  days?: Numeric;
  /** Called with `.toFixed()`. */
  price?: number;
  /** Called with `.toFixed()`; `0` means no discount. */
  discounted_price?: number;
  free_delivery_above?: Numeric;
}

/** `data` of `api.getUserActivePlan()`. */
export interface UserActivePlan {
  plan_name?: string;
  days_remaining?: Numeric;
  deliveries_number?: Numeric;
  total_money_saved?: Numeric;
  free_delivery_above?: Numeric;
}

/** A delivery slot from `api.getTimeSlots()` `data.time_slots`. */
export interface TimeSlot {
  id: Id;
  title?: string;
  /** Untranslated title; appended to `delivery_time` when placing the order. */
  default_title?: string;
  translations?: { title?: string };
  /** Sent back to the cart API as `is_free_delivery`; truthy check in the UI. */
  is_free_delivery?: Flag;
  /** `"express"` marks a Quick Delivery slot (timeSlotUtils.js). */
  slot_type?: string;
  /** `"HH:mm:ss"` cut-off for same-day orders; `null` = never closes. */
  last_order_time?: Nullable<string>;
  /** Quick Delivery duration in minutes. */
  duration_minutes?: Numeric;
  /** Client-side only: set by Checkout.jsx when the slot has closed for the chosen day. */
  isDisabled?: boolean;
}

/** `data` of `api.getTimeSlots()`. */
export interface TimeSlotsResponse {
  /** String `"1"` when on, number `0` when off — compare as a string (`isTimeSlotsEnabled`). */
  time_slots_is_enabled?: Numeric;
  /** Sent by backends before admin 2.1.3 ("true"/"false"); no longer in the response. See showsDeliverySchedule. */
  time_slot_setting?: string;
  /** Days until the earliest delivery date; used with `parseInt` and `- 1`. */
  delivery_estimate_days?: Numeric;
  /** How many days ahead the date picker allows, per module (e.g. "20"). */
  time_slots_allowed_days?: Numeric;
  time_slots?: TimeSlot[];
}

/** One locale's labels for a custom field. */
export interface CustomFieldTranslation {
  language_id?: Id;
  name?: string;
  /** Comma-separated string or array. */
  options?: string | string[];
}

/** Item of `custom_fields/list` (`api.getCustomFields()`) `data`. */
export interface CustomField {
  id: Id;
  name?: string;
  /**
   * Input type. Rendered: `"textarea"`, `"dropdown"`/`"select"`, `"radio"`,
   * `"checkbox"`, `"file"`, `"number"`, `"date"`, `"email"`; anything else is a text input.
   */
  type?: string;
  is_required?: Flag;
  sort_order?: Numeric;
  /** Comma-separated string or array; used when no translation carries options. */
  options?: string | string[];
  /** An array of rows without Content-Language, a single resolved object with it. */
  translations?: CustomFieldTranslation | CustomFieldTranslation[];
}

/** Values RequestProductCard styles; unknown values fall back to "approved". */
export type RequestedProductStatus = "pending" | "approved" | "rejected";

/** Item of `api.getRequestedProducts()` `data`. */
export interface RequestedProduct {
  id: Id;
  status?: RequestedProductStatus;
  description?: string;
  image_url?: Url;
  created_at?: DateString;
  /** Admin's reply / rejection reason. */
  admin_notes?: string;
}

/** Item of `api.getMailSettings()` `data` — one order status's notification toggles. */
export interface MailSettings {
  id: Id;
  status_name?: string;
  /** `1`/`0`; the page writes `checked ? 1 : 0`. */
  mail_status?: Flag;
  mobile_status?: Flag;
  sms_status?: Flag;
}
