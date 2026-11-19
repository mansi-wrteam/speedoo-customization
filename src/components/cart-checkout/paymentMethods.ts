// The gateway list, shared by the pay bar and the Select Payment Method sheet.
//
// `brandName` is deliberately NOT translated (WEB_PARITY_V4.0.2 §1.7): gateway
// names are brand names. Only the "Pay via" part of the label is translated.
import CashOnDeliveryImage from "@/assets/payment_methods_svgs/ic_cod.svg";
import CashfreeImage from "@/assets/payment_methods_svgs/ic_cashfree.svg";
import RazorpayImage from "@/assets/payment_methods_svgs/ic_razorpay.svg";
import PaypalImage from "@/assets/payment_methods_svgs/ic_paypal.svg";
import PaystackImage from "@/assets/payment_methods_svgs/ic_paystack.svg";
import StriperImage from "@/assets/payment_methods_svgs/ic_stripe.svg";
import MidtransImage from "@/assets/payment_methods_svgs/Midtrans.svg";
import PhonePeImage from "@/assets/payment_methods_svgs/Phonepe.svg";
import PaytabsImage from "@/assets/payment_methods_svgs/ic_paytabs.svg";
import DpoImage from "@/assets/payment_methods_svgs/ic_dpo_full.svg";
import type { ImageProps } from "next/image";
import type { PaymentMethod, PaymentMethodFlagKey, PaymentSettings } from "@/types/models";

export interface GatewayConfig {
  /** `payment_setting` flag that enables the gateway (`"1"`). */
  key: PaymentMethodFlagKey;
  /** Stored as `Checkout.selectedPaymentMethod` and sent to the server. */
  id: PaymentMethod;
  /** Shown to the customer as-is, in every language. */
  brandName: string;
  image: ImageProps["src"];
}

export const GATEWAYS: GatewayConfig[] = [
  { key: "razorpay_payment_method", id: "razorpay", brandName: "Razorpay", image: RazorpayImage },
  { key: "paypal_payment_method", id: "paypal", brandName: "PayPal", image: PaypalImage },
  { key: "paystack_payment_method", id: "paystack", brandName: "Paystack", image: PaystackImage },
  { key: "stripe_payment_method", id: "stripe", brandName: "Stripe", image: StriperImage },
  { key: "cashfree_payment_method", id: "cashfree", brandName: "Cashfree", image: CashfreeImage },
  { key: "midtrans_payment_method", id: "midtrans", brandName: "Midtrans", image: MidtransImage },
  { key: "phonepay_payment_method", id: "phonepe", brandName: "PhonePe", image: PhonePeImage },
  { key: "paytabs_payment_method", id: "paytabs", brandName: "PayTabs", image: PaytabsImage },
  { key: "dpo_payment_method", id: "dpo", brandName: "DPO", image: DpoImage },
];

export const CASH_IMAGE = CashOnDeliveryImage;

export const enabledGateways = (paymentSetting: PaymentSettings | null | undefined) =>
  GATEWAYS.filter((gateway) => String(paymentSetting?.[gateway.key]) === "1");

export const gatewayById = (id: PaymentMethod | null | undefined) =>
  GATEWAYS.find((gateway) => gateway.id === id);
