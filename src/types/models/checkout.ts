// Checkout flow: prescriptions, payment methods and the place-order /
// initiate-transaction responses.

import type { Id, Url } from "../common";

/**
 * Persisted part of an uploaded prescription image (kept in Redux; the Blob
 * lives in IndexedDB under `imageId` — see utils/prescriptionImageStore.js).
 */
export interface PrescriptionImageMeta {
  /** Client-generated, e.g. `"px_lq3k2x_8f7a6b5c"` (`newImageId`). */
  imageId: string;
  name: string;
  size: number;
  /** MIME type. */
  type: string;
}

export interface PrescriptionImage extends PrescriptionImageMeta {
  /** Runtime only — reattached from IndexedDB by `hydratePrescriptionImages`. */
  file?: File | Blob;
  /** Runtime only — object URL for the thumbnail. */
  preview?: string;
}

/** Binds selected cart lines to the prescription image(s) that cover them. */
export interface PrescriptionGroup {
  /** From `Checkout.prescriptionGroupSeq`. */
  id: number;
  /** Cart line `product_variant_id`s. */
  productIds: Id[];
  images: PrescriptionImage[];
}

/**
 * Value of `Checkout.selectedPaymentMethod`: `"COD"` and `"wallet"` are
 * literals in CheckoutPayment/WalletBalanceModal, the rest are the `label`s of
 * their `paymentMethodsConfig`. The API receives these capitalised
 * (`"Razorpay"`, `"DPO"`…).
 */
export type PaymentMethod =
  | "COD"
  | "Credit"
  | "wallet"
  | "razorpay"
  | "paypal"
  | "paystack"
  | "stripe"
  | "cashfree"
  | "midtrans"
  | "phonepe"
  | "paytabs"
  | "dpo";

export type OrderType = "doorstep" | "selfpickup";

/** `data` of `api.placeOrder()`. */
export interface PlaceOrderResponseData {
  order_id: Id;
}

/** PhonePe `initiate_transaction` data, kept in `Checkout.phonepecheckoutdetails` for the status check. */
export interface PhonePeInitData {
  token?: string;
  /** Sent back as `transaction_id` to `getOrderStatusPhonepe`. */
  merchantOrderId?: string;
  redirectUrl?: Url;
}

/** `data` of `api.getOrderStatusPhonepe()`. */
export interface PhonePeOrderStatusData {
  /** `"COMPLETED"`, `"FAILED"`, anything else is treated as pending. */
  status?: string;
  order_id?: Id;
}

/** `data` of `api.initiateTrasaction()`; which fields are set depends on the gateway. */
export interface InitiateTransactionData extends PhonePeInitData {
  /** Razorpay order id passed to the Razorpay checkout. */
  transaction_id?: string;
  /** Stripe PaymentIntent client secret. */
  client_secret?: string;
  /** Stripe PaymentIntent id. */
  id?: string;
  /** PayPal approval URL. (`redirectUrl` covers Cashfree, PhonePe, PayTabs, DPO.) */
  paypal_redirect_url?: Url;
  /** Midtrans Snap URL. */
  snapUrl?: Url;
}
