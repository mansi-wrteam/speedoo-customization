// Globals the app reads or writes on `window`.
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";

/** Razorpay Checkout, loaded at runtime from checkout.razorpay.com (Checkout.jsx, WalletBalanceModal.jsx). */
interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (response: unknown) => void): void;
}

interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
    /** Firebase phone auth: set by signInWithPhoneNumber, confirmed with the OTP. */
    confirmationResult?: ConfirmationResult;
    /** Firebase invisible reCAPTCHA; reset to undefined between attempts. */
    recaptchaVerifier?: RecaptchaVerifier;
    /** Google Maps JS API, loaded by @react-google-maps/api. */
    google: typeof google;
  }
}

export {};
