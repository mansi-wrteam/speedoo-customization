import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/utils/translation";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import * as api from "@/api/apiRoutes";
import { RiCloseFill } from "react-icons/ri";
import { toast } from "react-toastify";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { addUserBalance } from "@/redux/slices/userSlice";
import { CiWallet } from "react-icons/ci";
import type PaystackPopModule from "@paystack/inline-js";
import type { StaticImageData } from "next/image";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id } from "@/types/common";
import type { PaymentMethodFlagKey, SubscriptionPlan } from "@/types/models";
let PaystackPop: typeof PaystackPopModule;

if (typeof window !== "undefined") {
  import("@paystack/inline-js").then((module) => {
    PaystackPop = module.default;
  });
}
// payment SVGS
import CashfreeImage from "@/assets/payment_methods_svgs/ic_cashfree.svg";
import RazorpayImage from "@/assets/payment_methods_svgs/ic_razorpay.svg";
import PaypalImage from "@/assets/payment_methods_svgs/ic_paypal.svg";
import PaystackImage from "@/assets/payment_methods_svgs/ic_paystack.svg";
import StriperImage from "@/assets/payment_methods_svgs/ic_stripe.svg";
import MidtransImage from "@/assets/payment_methods_svgs/Midtrans.svg";
import PhonePeImage from "@/assets/payment_methods_svgs/Phonepe.svg";
import PaytabsImage from "@/assets/payment_methods_svgs/ic_paytabs.svg";
import DpoImage from "@/assets/payment_methods_svgs/ic_dpo_full.svg";
// import StripeModal from "@/components/cart-checkout/StripeModal";
import dynamic from "next/dynamic";

const StripeModal = dynamic(() => import("@/components/cart-checkout/StripeModal"), {
  ssr: false,
});
import { setPhonePeCheckoutDetails } from "@/redux/slices/checkoutSlice";

/** A gateway row: its `payment_setting` on/off flag, label key and logo. */
interface PaymentMethodConfig {
  key: PaymentMethodFlagKey;
  label: string;
  image: StaticImageData;
}

/** Razorpay Checkout `handler` argument; all three ids go to add_transaction. */
interface RazorpaySuccessResponse {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface WalletBalanceModalProps {
  addWalletModal: boolean;
  setAddWalletModal: React.Dispatch<React.SetStateAction<boolean>>;
  /** "wallet" (top-up, ProfileSidebar) or "subscription" (plan purchase, Subscriptions). */
  type?: "wallet" | "subscription";
  /** Only for `type: "subscription"`. */
  selectedPlan?: SubscriptionPlan | null;
  /**
   * Seeds the amount field when the modal opens. Checkout's "Add ₹N" top-up
   * pill passes the shortfall so the customer does not have to work it out
   * (WEB_PARITY_V4.0.2 §1.7).
   */
  prefillAmount?: number | null;
}

const paymentMethodsConfig: PaymentMethodConfig[] = [
  { key: "razorpay_payment_method", label: "razorpay", image: RazorpayImage },
  { key: "paypal_payment_method", label: "paypal", image: PaypalImage },
  { key: "paystack_payment_method", label: "paystack", image: PaystackImage },
  { key: "stripe_payment_method", label: "stripe", image: StriperImage },
  { key: "cashfree_payment_method", label: "cashfree", image: CashfreeImage },
  { key: "midtrans_payment_method", label: "midtrans", image: MidtransImage },
  { key: "phonepay_payment_method", label: "phonepe", image: PhonePeImage },
  { key: "paytabs_payment_method", label: "paytabs", image: PaytabsImage },
  { key: "dpo_payment_method", label: "dpo", image: DpoImage },
];

const WalletBalanceModal = ({
  addWalletModal,
  setAddWalletModal,
  type = "wallet",
  selectedPlan = null,
  prefillAmount = null,
}: WalletBalanceModalProps) => {
  const setting = useSelector((state: RootState) => state.Setting);
  const user = useSelector((state: RootState) => state?.User);
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();

  const [selectedPaymentMethod, setSelectPaymentMethod] = useState<string>();
  const [amount, setAmount] = useState<number | null>(null);
  const [showStripe, setShowStripe] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | undefined>("");
  const [stripeTransId, setStripeTransId] = useState<string | null | undefined>(null);

  const handleSelectedPaymentMethod = (value: string) => {
    setSelectPaymentMethod(value);
  };

  const enabledPaymentMethods = paymentMethodsConfig.filter(
    (method) =>
      setting?.payment_setting?.[method.key] &&
      setting?.payment_setting?.[method.key] === "1"
  );

  const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value));
  };

  useEffect(() => {
    if (addWalletModal === false) {
      (setSelectPaymentMethod as (value?: string) => void)();
      setAmount(null);
    } else if (prefillAmount != null) {
      setAmount(prefillAmount);
    }
  }, [addWalletModal, prefillAmount]);


  const handleSubmit = async () => {
    if (type == "wallet") {
      if (amount === null) {
        toast.error(t("wallet_amount_required"));
        return;
      } else if (amount <= 0) {
        toast.error(t("wallet_amount_must_be_greater_than_zero"));
        return;
      } else if (selectedPaymentMethod === undefined) {
        toast.error(t("wallet_payment_method_required"));
        return;
      } else if (amount % 1 !== 0) {
        toast.error(t("wallet_amount_cannot_be_decimal"));
        return;
      }
    }

    if (type == "subscription") {
      if (selectedPlan?.id == null) {
        toast.error(t("please_select_a_plan"));
        return;
      } else if (selectedPaymentMethod === undefined) {
        toast.error(t("please_select_payment_method"));
        return;
      }
    }

    // `discounted_price: 0` means NO discount, so charge `price` (§11). A
    // truthy test got that right for the number 0 and wrong for the string
    // "0", which this field can arrive as — and charging "0" is charging
    // nothing.
    const subscriptionPlanPrice =
      Number(selectedPlan?.discounted_price) > 0
        ? selectedPlan?.discounted_price
        : selectedPlan?.price;

    if (selectedPaymentMethod === "wallet") {
      if ((user?.user?.balance as number) < (subscriptionPlanPrice as number)) {
        toast.error(t("insufficient_wallet_balance"));
        return;
      }
    }

    const capitalizedPaymentMethod =
      selectedPaymentMethod === "dpo"
        ? "DPO"
        : // Checked above for both wallet and subscription.
          selectedPaymentMethod!.charAt(0)?.toUpperCase() +
          selectedPaymentMethod!.slice(1);

    if (capitalizedPaymentMethod !== "Paystack") {
      const result = await api.initiateTrasaction({
        paymentMethod: capitalizedPaymentMethod,
        type: type,
        walletAmount: amount as number,
        subscriptionPlanId: selectedPlan?.id
      });
      if (result?.status === 1) {
        if (capitalizedPaymentMethod === "Razorpay") {
          handleRazorpayPayment(null, result?.data?.transaction_id, amount);
        } else if (capitalizedPaymentMethod === "Stripe") {
          setStripeClientSecret(result?.data?.client_secret);
          setStripeTransId(result?.data?.id);
          setShowStripe(true);
          // setAddWalletModal(false);
        } else if (capitalizedPaymentMethod === "Wallet") {
          toast.success(t('subscription_add_description'))
          setAddWalletModal(false);
          setTimeout(() => {
            router.push('/profile/subscription')
          }, 2000);
        }
        else {
          if (capitalizedPaymentMethod == "Phonepe") {
            dispatch(setPhonePeCheckoutDetails(result?.data));
          }
          const paymentUrls = {
            cashfree: result?.data?.redirectUrl,
            phonepe: result?.data?.redirectUrl,
            paytabs: result?.data?.redirectUrl,
            paypal: result?.data?.paypal_redirect_url,
            midtrans: result?.data?.snapUrl,
            dpo: result?.data?.redirectUrl,
          };
          // Select specific paymentUrls
          const redirectUrl = paymentUrls[selectedPaymentMethod as keyof typeof paymentUrls];
          if (redirectUrl) {
            router.push(redirectUrl);
          } else {
            console.error("Unsupported payment method:", selectedPaymentMethod);
          }
        }
      } else {
        setAddWalletModal(false);
        toast.error(result?.message);
      }
    } else {
      handlePayStackPayment(type, selectedPlan, amount, capitalizedPaymentMethod);
    }
  };

  const handlePayStackPayment = async (
    type: "wallet" | "subscription",
    selectedPlan: SubscriptionPlan | null,
    amount: number | null,
    capilizePaymeneMethod: string
  ) => {
    // Same plan price as the modal total and the other gateways: the
    // discounted price when one is set.
    const finalAmount =
      type === "subscription"
        ? Number(selectedPlan?.discounted_price) > 0
          ? selectedPlan?.discounted_price
          : selectedPlan?.price
        : amount;
    try {
      const handler = PaystackPop.setup({
        key:
          setting.payment_setting! &&
          setting.payment_setting.paystack_public_key,
        email: user && user?.user?.email,
        amount: parseFloat(finalAmount as unknown as string) * 100,
        currency:
          setting?.payment_setting! &&
          setting?.payment_setting?.paystack_currency_code,
        ref: new Date().getTime().toString(),
        label: setting?.setting! && setting?.setting?.support_email,
        onClose: function () {
          // api.deleteOrder({ orderId: orderId });
          setAddWalletModal(false);
        },
        onError: (error: Error) => {
          console.log("Error: ", error.message);
        },
        callback: async function (res) {
          try {
            // setPaymentLoading(true)
            const response = await api.addTransaction({
              transactionId: res.reference,
              paymentMethod: capilizePaymeneMethod,
              type: type,
              subscriptionPlanId: selectedPlan?.id,
              walletAmount: amount as number,
            });
            if (response.status == 1) {
              // setPaymentLoading(true)
              // toast.success(response.message);
              // Only a top-up adds to the balance (a subscription has no amount).
              if (type == "wallet") {
                dispatch(addUserBalance({ data: amount as number }));
              }
              setAddWalletModal(false);
              router.push(
                `/web-payment-status?type=${type}&status_code=200&status=success`
              );
              // setIsOrderPlaced(true);
              // dispatch(setCartSubTotal({ data: 0 }));
            } else {
              // setPaymentLoading(true)
              toast.error(response.message);
              setAddWalletModal(false);
            }
          } catch (error) {
            console.log("Error", error);
          }
        },
      });
      handler.openIframe();
    } catch (error) {
      console.log("Paytabs Error", error);
    }
  };

  const initializeRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      // document.body.appendChild(script);
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async (
    order_id: Id | null,
    razorpay_transaction_id: string | undefined,
    amount: number | null
  ) => {
    try {
      const res = await initializeRazorpay();
      if (!res) {
        console.error("RazorPay SDK Load Failed");
        return;
      }
      const key = setting?.payment_setting?.razorpay_key;
      const convertedAmount = Math.floor((amount as number) * 100);
      const options = {
        key: key,
        amount: convertedAmount,
        currency: "INR",
        name: user?.user?.name,
        description: setting?.setting?.app_name,
        image: setting?.setting?.web_settings!.web_logo,
        order_id: razorpay_transaction_id,
        handler: async (res: RazorpaySuccessResponse) => {
          if (res.razorpay_payment_id) {
            try {
              const response = await api.addTransaction({
                transactionId: res.razorpay_payment_id,
                paymentMethod:
                  selectedPaymentMethod!.charAt(0).toUpperCase() +
                  selectedPaymentMethod!.slice(1),
                type: type,
                subscriptionPlanId: selectedPlan?.id,
                walletAmount: amount as number,
                razorpay: res,
              });
              if (response.status === 1) {
                // Only a top-up adds to the balance (a subscription has no amount).
                if (type == "wallet") {
                  dispatch(addUserBalance({ data: amount as number }));
                }
                setAddWalletModal(false);
                router.push(
                  `/web-payment-status?type=${type}&status_code=200&status=success`
                );
              } else {
                toast.error(response.message);
                setAddWalletModal(false);
              }
            } catch (error) {
              console.log("Transaction error:", error);
            }
          } else {
            console.log("Razorpay Payment Failed");
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: async (reason: unknown) => {
            if (reason === undefined) {
              setAddWalletModal(false);
            }
          },
        },
        retry: {
          enabled: false,
        },
        prefill: {
          name: user?.user?.name,
          email: user?.user?.email,
          contact: user?.user?.mobile,
        },
        notes: {
          address: "Razorpay Corporate",
        },
        theme: {
          color: setting?.setting?.web_settings!.color,
        },
      };

      // if (typeof window !== "undefined") {
      const rzpay = new window.Razorpay(options);
      rzpay.on("payment.cancel", (response) => {
        alert("Payment Cancelled");
        toast.error("Payment Cancelled");
      });

      rzpay.on("payment.failed", (response) => {
        setAddWalletModal(false);
        router.push(`/web-payment-status?type=${type}&status=failed`);
      });

      rzpay.open();
    } catch (error) {
      console.error("Error initializing Razorpay:", error);
    }
  };

  return (
    <div>
      <Dialog open={addWalletModal} onOpenChange={setAddWalletModal}>
        <DialogContent aria-describedby="addWalletModal " className="max-w-[650px] w-full p-0 gap-0 max-h-[90vh] border-0 rounded-2xl overflow-hidden bg-[var(--background-subtle)] flex flex-col">
          <DialogHeader className="shrink-0 p-4 border-b border-[var(--border-subtle)] flex flex-row justify-between items-center space-y-0">
            <DialogTitle>
              <h1 className="text-xl font-semibold text-[var(--foreground-primary)]">
                {type == "wallet" ? t("add_to_wallet") : t("complete_payment")}
              </h1>
            </DialogTitle>
            <div className="rounded-lg p-3 cursor-pointer">
              <RiCloseFill
                size={22}
                className="text-[var(--button-link-foreground-default)]"
                onClick={() => setAddWalletModal(false)}
              />
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 p-6 overflow-y-auto">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <>
                  {type == "wallet" ? (
                    <>
                      <label htmlFor="walletAmount" className="text-sm font-normal text-[var(--form-default-label)]">
                        {t("amount")}
                      </label>
                      <input
                        type="number"
                        id="walletAmount"
                        value={amount !== null ? amount : ""}
                        placeholder={t("type_amount")}
                        className="w-full py-2 px-3 bg-[var(--form-default-background)] border border-[var(--form-default-border)] rounded-lg outline-none text-base text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)]"
                        onChange={(e) => handleAmount(e)}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] p-4 rounded-2xl flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-[var(--foreground-primary)]">
                          {t("subscription_plan")}
                        </span>
                        <span className="text-base font-medium text-[var(--foreground-tertiary)]">
                          {selectedPlan?.name}
                        </span>
                      </div>
                      <div className="h-px bg-[var(--border-strong)] opacity-30" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-[var(--foreground-secondary)]">
                          {t("original_price")}
                        </span>
                        <span className="text-sm font-bold text-[var(--foreground-secondary)]">
                          {setting?.setting?.currency}{selectedPlan?.price?.toFixed(2)}
                        </span>
                      </div>
                      {(selectedPlan?.discounted_price as number) > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-[var(--foreground-secondary)]">
                            {t("discount")}
                          </span>
                          <span className="text-sm font-bold text-[var(--foreground-secondary)]">
                            - {setting?.setting?.currency}{((selectedPlan?.price as number) - (selectedPlan?.discounted_price as number))?.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="p-3 bg-[var(--surface-default)] rounded-lg flex justify-between items-center">
                        <span className="text-base font-bold text-[var(--foreground-primary)]">
                          {t("total_amount")}
                        </span>
                        <span className="text-base font-bold text-[var(--foreground-primary)]">
                          {setting?.setting?.currency}{((selectedPlan?.discounted_price as number) > 0 ? selectedPlan?.discounted_price : selectedPlan?.price)?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              </div>
              <div className="flex flex-col gap-3">
                <h1 className="text-base font-semibold text-[var(--foreground-primary)]">
                  {t("choose_payment_method")}
                </h1>
                <div className="flex flex-col gap-2">
                  {type == "subscription" &&
                    <div
                      key={"wallet"}
                      data-method={"wallet"}
                      className={`p-4 flex justify-between items-center rounded-lg ${selectedPaymentMethod === "wallet"
                        ? "bg-[var(--brand-background-subtle)] border border-[var(--brand-foreground-default)]"
                        : "bg-[var(--background-default)] border border-[var(--border-default)]"
                        }`}
                      onClick={() => handleSelectedPaymentMethod("wallet")}
                    >
                      <div className="flex gap-2 items-center">
                        <CiWallet size={24} />
                        <p className="text-base font-normal text-[var(--foreground-primary)]">
                          {t("wallet")}
                        </p>
                      </div>
                      <div>
                        <input
                          id="paymentRadio"
                          type="radio"
                          name="payment_method"
                          className="appearance-none w-5 h-5 rounded-full outline outline-2 outline-[var(--radio-unselected-border)] cursor-pointer checked:bg-[var(--radio-selected-background)] checked:outline-[var(--radio-selected-border)] checked:border-[3px] checked:border-[var(--surface-default)]"
                          checked={selectedPaymentMethod === "wallet"}
                          onChange={() => handleSelectedPaymentMethod("wallet")}
                        />
                      </div>
                    </div>
                  }
                  {enabledPaymentMethods.map((method) => (
                    <div
                      key={method.key}
                      data-method={method.label}
                      className={`p-4 flex justify-between items-center rounded-lg ${selectedPaymentMethod === method.label
                        ? "bg-[var(--brand-background-subtle)] border border-[var(--brand-foreground-default)]"
                        : "bg-[var(--background-default)] border border-[var(--border-default)]"
                        }`}
                      onClick={() => handleSelectedPaymentMethod(method.label)}
                    >
                      <div className="flex gap-2 items-center">
                        <Image
                          src={method.image}
                          className="h-8 w-8"
                          height={32}
                          width={32}
                          unoptimized
                          alt={t(method.label)}
                        />
                        <p className="text-base font-normal text-[var(--foreground-primary)]">
                          {t(method.label)}
                        </p>
                      </div>
                      <div>
                        <input
                          id="paymentRadio"
                          type="radio"
                          name="payment_method"
                          className="appearance-none w-5 h-5 rounded-full outline outline-2 outline-[var(--radio-unselected-border)] cursor-pointer checked:bg-[var(--radio-selected-background)] checked:outline-[var(--radio-selected-border)] checked:border-[3px] checked:border-[var(--surface-default)]"
                          checked={selectedPaymentMethod === method.label}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-end">
                    <button
                      className="px-4 py-2 bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] text-[var(--button-primary-foreground-default)] rounded-lg text-base font-medium transition-colors"
                      onClick={handleSubmit}
                    >
                      {type == "wallet"
                        ? t("add_money")
                        : t("complete_payment")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <StripeModal
        clientSecret={stripeClientSecret}
        stripeTransId={stripeTransId}
        showStripe={showStripe}
        setShowStripe={setShowStripe}
        amount={amount as number}
        setWalletModal={setAddWalletModal}
        type={type}
        subscriptionPlanId={selectedPlan?.id}
      />
    </div>
  );
};

export default WalletBalanceModal;
