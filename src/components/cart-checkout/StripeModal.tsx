import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import {
  useStripe,
  useElements,
  PaymentElement,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  ElementsConsumer,
} from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeCardElementOptions, StripeCardNumberElement, StripeElements } from "@stripe/stripe-js";
import { useDispatch, useSelector } from "react-redux";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import type { TransactionType } from "@/api/apiRoutes";
import { addUserBalance } from "@/redux/slices/userSlice";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { clearPlacedOrderCart } from "@/utils/clearPlacedOrderCart";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id, Numeric } from "@/types/common";

/** Props StripeModal forwards down to the card form. */
interface StripePaymentProps {
  /** PaymentIntent client secret from `initiateTrasaction` (set before the modal opens). */
  clientSecret: string | null | undefined;
  setShowStripe: React.Dispatch<React.SetStateAction<boolean>>;
  /** Order total (checkout) or top-up amount (wallet). */
  amount: Numeric;
  /** Only WalletBalanceModal passes it; the checkout flow does not. */
  setWalletModal?: React.Dispatch<React.SetStateAction<boolean>>;
  /** Set for orders; absent for wallet top-ups and subscriptions. */
  stripeOrderId?: Id | null;
  type: TransactionType;
  /** The chosen plan; WalletBalanceModal passes it for subscriptions. */
  subscriptionPlanId?: Id;
}

// Stripe Elements render inside a cross-origin iframe, so they can't inherit
// CSS custom properties — the values have to be resolved here and passed in.
// Reading from documentElement picks up the `.dark` overrides automatically.
const token = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

const getCardOptions = (theme: string): StripeCardElementOptions => {
  const isDark = theme === "dark";
  return {
    iconStyle: "solid",
    style: {
      base: {
        color: token("--form-default-text", isDark ? "#fafafa" : "#171717"),
        iconColor: token(
          "--form-default-icon",
          isDark ? "#d4d4d4" : "#404040"
        ),
        fontWeight: 500,
        fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
        fontSize: "16px",
        fontSmoothing: "antialiased",
        ":-webkit-autofill": {
          color: token("--form-default-text", isDark ? "#fafafa" : "#171717"),
        },
        "::placeholder": {
          color: token(
            "--form-default-placeholder",
            isDark ? "#737373" : "#737373"
          ),
        },
      },
      invalid: {
        color: token("--status-error-default", "#d63031"),
        iconColor: token("--status-error-default", "#d63031"),
      },
    },
  };
};
const cardFieldClass =
  "rounded-lg bg-[var(--form-default-background)] px-3 py-3 outline outline-1 -outline-offset-1 outline-[var(--form-default-border)]";

interface CheckoutFormProps extends StripePaymentProps {
  /** PaymentIntent id, sent to addTransaction. */
  transactionId: string | null | undefined;
  /** From ElementsConsumer; never read (the form uses useStripe/useElements). */
  elements?: StripeElements | null;
  /** From ElementsConsumer; never read. */
  stripe?: Stripe | null;
}

const CheckoutForm = ({
  clientSecret,
  setShowStripe,
  amount,
  transactionId,
  setWalletModal,
  stripeOrderId,
  type,
  subscriptionPlanId,
}: CheckoutFormProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state?.User?.user);
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const router = useLocalizedRouter();
  const cardElementOptions = getCardOptions(theme);
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  // const type = stripeOrderId ? "order" : "wallet";
  const handleOnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!stripe || !elements) {
      console.log("Stripe not loaded yet");
      return;
    }

    try {
      const { paymentIntent, error } = await stripe.confirmCardPayment(
        clientSecret as string,
        {
          payment_method: {
            card: elements.getElement(CardNumberElement) as StripeCardNumberElement,
            billing_details: {
              name: user!.name,
              address: {
                line1: "510 Townsend St",
                postal_code: "98140",
                city: "San Francisco",
                state: "CA",
                country: "US",
              },
            },
          },
        }
      );
      if (paymentIntent?.status === "succeeded") {
        await handleAddPayment();
      } else {
        setShowStripe(false);
        // Optional: only the wallet/subscription modal passes it (not Checkout).
        setWalletModal?.(false);
        const urlOptions: { type: TransactionType; status: string; order_id?: Id } = {
          type: type,
          status: "failed",
        };
        if (stripeOrderId) {
          urlOptions.order_id = stripeOrderId;
        }
        router.push({ pathname: `/web-payment-status`, query: urlOptions });
      }
    } catch (error) {
      console.log("Error", error);
    }
    setIsLoading(false);
  };

  const handleAddPayment = async () => {
    const orderId = stripeOrderId ? stripeOrderId : null;
    try {
      const result = await api.addTransaction({
        orderId: orderId,
        transactionId: transactionId as string,
        walletAmount: amount,
        type: type,
        paymentMethod: "Stripe",
        subscriptionPlanId: subscriptionPlanId
      });
      if (type == "wallet") {
        dispatch(addUserBalance({ data: amount as number }));
        setWalletModal!(false);
      }
      if (type == "order") {
        // Empty the cart before the success page, not after it.
        void clearPlacedOrderCart(dispatch);
      }
      setShowStripe(false);
      const urlOptions: { type: TransactionType; status_code: number; status: string; order_id?: Id } = {
        type: type,
        status_code: 200,
        status: "success",
      };
      if (stripeOrderId) {
        urlOptions.order_id = stripeOrderId;
      }
      router.push({ pathname: `/web-payment-status`, query: urlOptions });
    } catch (err) {
      console.log("Error: ", (err as Error)?.message);
    }
  };

  return (
    <form
      onSubmit={handleOnSubmit}
      className={"min-h-[150px]  flex flex-col justify-center gap-4 mt-3"}
    >
      {/* Separate fields rather than the one-line CardElement, which overlaps
          its number, expiry and CVC inputs on narrow (320px) screens. */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`col-span-2 ${cardFieldClass}`}>
          <CardNumberElement options={{ ...cardElementOptions, showIcon: true }} />
        </div>
        <div className={cardFieldClass}>
          <CardExpiryElement options={{ style: cardElementOptions.style }} />
        </div>
        <div className={cardFieldClass}>
          <CardCvcElement options={{ style: cardElementOptions.style }} />
        </div>
      </div>
      <div className="flex justify-center">
        <button
          className="mt-4 rounded-lg bg-[var(--button-primary-background-default)] px-6 py-3 text-base font-medium leading-6 text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:cursor-not-allowed disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-foreground-disabled)] disabled:hover:bg-[var(--button-primary-background-disabled)]"
          disabled={!stripe || isLoading}
        >
          {isLoading ? t("loading") : t("submit")}
        </button>
      </div>
    </form>
  );
};

interface InjectedCheckoutFormProps extends StripePaymentProps {
  transactionId: string | null | undefined;
  /** Passed by StripeModal but never read. */
  stripe?: Promise<Stripe | null> | null;
  /** Passed by StripeModal but never read. */
  options?: StripeCardElementOptions;
}

const InjectedCheckoutForm = ({
  clientSecret,
  transactionId,
  setShowStripe,
  amount,
  setWalletModal,
  stripeOrderId,
  type,
  subscriptionPlanId,
}: InjectedCheckoutFormProps) => {
  return (
    <ElementsConsumer>
      {({ elements, stripe }) => (
        <CheckoutForm
          elements={elements}
          stripe={stripe}
          clientSecret={clientSecret}
          transactionId={transactionId}
          setShowStripe={setShowStripe}
          amount={amount}
          setWalletModal={setWalletModal}
          stripeOrderId={stripeOrderId}
          type={type}
          subscriptionPlanId={subscriptionPlanId}
        />
      )}
    </ElementsConsumer>
  );
};

export interface StripeModalProps extends StripePaymentProps {
  showStripe: boolean;
  /** PaymentIntent id, sent to addTransaction. */
  stripeTransId: string | null | undefined;
}

const StripeModal = ({
  showStripe,
  setShowStripe,
  clientSecret,
  stripeTransId,
  amount,
  setWalletModal,
  stripeOrderId,
  type,
  subscriptionPlanId,
}: StripeModalProps) => {
  const setting = useSelector((state: RootState) => state.Setting);
  const stripePromise = useMemo(() => {
    if (!setting?.payment_setting?.stripe_publishable_key) return null;
    return loadStripe(setting.payment_setting.stripe_publishable_key);
  }, [setting?.payment_setting?.stripe_publishable_key]);
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const cardElementOptions = getCardOptions(theme);

  return (
    <Dialog open={showStripe}>
      <DialogContent className="w-[600px] max-w-[calc(100vw-2rem)] rounded-2xl border-0 bg-[var(--surface-default)] p-4 sm:p-6">
        <DialogHeader>
          <div className="flex flex-row items-center justify-between gap-2">
            <p className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
              {t("stripe")}
            </p>
            <button
              type="button"
              onClick={() => setShowStripe(false)}
              className="flex flex-shrink-0 items-center justify-center rounded-lg p-2 text-[var(--button-link-foreground-default)] transition-colors hover:text-[var(--button-link-foreground-hover)]"
            >
              <RiCloseFill size={22} />
            </button>
          </div>
        </DialogHeader>
        <div>
          <Elements
            stripe={stripePromise}
          >
            <InjectedCheckoutForm
              setShowStripe={setShowStripe}
              stripe={stripePromise}
              options={cardElementOptions}
              clientSecret={clientSecret}
              transactionId={stripeTransId}
              amount={amount}
              setWalletModal={setWalletModal}
              stripeOrderId={stripeOrderId}
              type={type}
              subscriptionPlanId={subscriptionPlanId}
            />
          </Elements>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StripeModal;
