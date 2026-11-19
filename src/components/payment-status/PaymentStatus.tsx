"use client";
import React, { useEffect, useRef, useState } from "react";
import { useLocalizedRouter } from "@/utils/localizedNav";
import dynamic from "next/dynamic";
import { useDispatch, useSelector } from "react-redux";
import * as api from "@/api/apiRoutes";
import { clearCheckout } from "@/redux/slices/checkoutSlice";
import { clearImages } from "@/utils/prescriptionImageStore";
import { clearPlacedOrderCart } from "@/utils/clearPlacedOrderCart";
import { t } from "@/utils/translation";
import {
  mayDeleteOrder,
  resolveReturnOutcome,
  resolveVerifyOutcome,
  type PaymentOutcome,
  type PaymentReturnQuery,
} from "@/utils/paymentOutcome";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
import animationFailed from "@/assets/order_place_animation/order_failed_animation.json";
import OrderPlacedIcon from "@/components/common/OrderPlacedIcon";
import { FiAlertCircle } from "react-icons/fi";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id } from "@/types/common";
import type { PhonePeInitData } from "@/types/models";

const PaymentStatus = () => {
  const dispatch = useDispatch<AppDispatch>();
  const phonePeData = useSelector(
    (state: RootState) => state.Checkout.phonepecheckoutdetails
  );
  const router = useLocalizedRouter();
  const { query } = router;

  const [status, setStatus] = useState<PaymentOutcome | "">("");
  const [type, setType] = useState("");
  // The checkout usually empties the cart before redirecting here; gateways
  // that leave the site (Cashfree, PhonePe, PayPal...) only can once they
  // report back, so a successful order is cleared here, at most once.
  const cartCleared = useRef(false);
  const cartLineCount = useSelector(
    (state: RootState) => state.Cart.cartProducts?.length ?? 0
  );

  useEffect(() => {
    if (status !== "success" || type !== "order" || cartCleared.current) return;
    cartCleared.current = true;
    if (cartLineCount > 0) void clearPlacedOrderCart(dispatch);
  }, [status, type]);

  const isWalletTransaction = ({ type, order_id }: PaymentReturnQuery) =>
    type === "wallet" || order_id?.startsWith("wallet-");

  const isSubscriptionTransaction = ({ type, order_id }: PaymentReturnQuery) =>
    type === "subscription" || order_id?.startsWith("subscription-");

  useEffect(() => {
    if (!type) return; // wait until the query effect resolves the real type
    // An unresolved payment needs reading, so it is never auto-dismissed.
    if (status === "unresolved" || status === "pending") return;
    const timer = setTimeout(() => {
      if (type == "wallet" || type == "subscription") {
        handleWalletClose();
      } else {
        handlePaymentClose();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [type, status]);

  useEffect(() => {
    if (!query || Object.keys(query).length === 0) return;
    if (query?.payment_method == "phonepe") {
      handleGetOrderStatusPhonepe();
      return;
    }
    const paymentStatus = resolveReturnOutcome(query as PaymentReturnQuery);
    const isWallet = isWalletTransaction(query as PaymentReturnQuery);
    const isSubscription = isSubscriptionTransaction(query as PaymentReturnQuery);
    setType(isWallet ? "wallet" : isSubscription ? "subscription" : "order");
    setStatus(paymentStatus);
  }, [query]);

  const handleWalletClose = () => {
    router.replace("/");
  };

  /**
   * PhonePe's verify currently answers HTTP 200 with an EMPTY BODY, so the old
   * "anything that is not COMPLETED is a failure" reading tore down orders
   * that had been paid. Only an explicit FAILED deletes anything now; an
   * unreadable answer is unresolved and the server reconciles it (§11).
   */
  const handleGetOrderStatusPhonepe = async () => {
    setType("order");
    try {
      const response = await api.getOrderStatusPhonepe({
        token: (phonePeData as PhonePeInitData).token,
        transaction_id: (phonePeData as PhonePeInitData).merchantOrderId,
      });
      const outcome = resolveVerifyOutcome(response?.data);
      setStatus(outcome);
      if (mayDeleteOrder(outcome)) {
        await handleFailedOrder(response?.data?.order_id);
      }
    } catch (error) {
      // The verify never completed; that says nothing about the payment.
      console.log("error", error);
      setStatus("unresolved");
    }
  };

  const handlePaymentClose = async () => {
    if (!cartCleared.current) {
      cartCleared.current = true;
      await clearPlacedOrderCart(dispatch);
    }
    router.replace("/");
  };

  const extractOrderNumber = (orderId: string | undefined) => {
    if (!orderId) return null;
    const regex = /^order-(\d+)-\d+$/;
    const match = orderId.match(regex);
    return match ? match[1] : /^\d+$/.test(orderId) ? orderId : null;
  };

  const handleFailedOrder = async (orderId: Id | null | undefined = null) => {
    if (!query || Object.keys(query).length === 0) return;
    let localOrderId;
    if (orderId == null) {
      localOrderId = extractOrderNumber(query.order_id as string | undefined);
    } else {
      localOrderId = orderId;
    }
    try {
      await api.deleteOrder({ orderId: localOrderId as Id });
      dispatch(clearCheckout());
      clearImages(); // drop the stored prescription blobs with the checkout
      router.push("/");
    } catch (error) {
      console.error("Error", error);
    }
  };


  const orderNumber = extractOrderNumber(query?.order_id as string | undefined);

  const renderContent = () => {
    if (status == "success") {
      return (
        <div className="flex flex-col items-center gap-8">
          <OrderPlacedIcon />
          <div className="text-center mt-8">
            <h1 className="text-2xl font-semibold">
              {type == "wallet"
                ? t("wallet_add_description")
                : type == "subscription"
                  ? t("subscription_add_description")
                  : t("order_placed_description")}
            </h1>
            <div className="flex flex-col md:flex-row justify-center gap-4 mx-4 mt-8">
              <button
                className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                onClick={
                  type == "wallet" || type == "subscription"
                    ? handleWalletClose
                    : handlePaymentClose
                }
              >
                {t("home")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (status == "failed") {
      return (
        <div className="flex flex-col relative gap-8">
          <Lottie
            className="h-44"
            animationData={animationFailed}
            loop={false}
          />
          <div className="text-center mt-8">
            <h1 className="text-2xl">{t("order_failed_description")}</h1>
            <button
              className="mt-8 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
              onClick={type == "wallet" || type == "subscription" ? handleWalletClose : () => handleFailedOrder()}
            >
              {t("home")}
            </button>
          </div>
        </div>
      );
    }

    // Unresolved or still processing. Both used to render NOTHING — a blank
    // screen, followed three seconds later by the cart being cleared.
    //
    // We deliberately do not say "failed" here: the payment may well have gone
    // through, and the order stays put for the server to reconcile (§11).
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--status-warning-background)] text-[var(--status-warning-foreground)]">
          <FiAlertCircle size={38} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[var(--foreground-primary)]">
            {t("payment_unresolved_title")}
          </h1>
          <p className="text-base leading-relaxed text-[var(--foreground-tertiary)]">
            {t("payment_unresolved_description")}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {orderNumber && (
            <button
              className="rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2 text-base font-medium leading-6 text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
              onClick={() => router.replace(`/order-detail/${orderNumber}`)}
            >
              {t("view_details")}
            </button>
          )}
          <button
            className="rounded-lg px-4 py-2 text-base font-medium leading-6 text-[var(--button-outline-foreground-default)] outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] transition-colors hover:bg-[var(--button-outline-background-hover)]"
            onClick={type == "wallet" || type == "subscription" ? handleWalletClose : handlePaymentClose}
          >
            {t("home")}
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="min-h-[600px] flex items-center">
      <div className="container">{renderContent()}</div>
    </section>
  );
};

export default PaymentStatus;
