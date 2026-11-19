import React from "react";
import { FaCheck } from "react-icons/fa";
import { t } from "@/utils/translation";
import type { Id } from "@/types/common";

export interface OrderSuccessViewProps {
  orderId?: Id | null;
  /** "Arriving in 35 minutes", "Today · Morning" — whatever the order promises. */
  eta?: string | null;
  onContinue: () => void;
  onViewOrder: () => void;
}

/**
 * Swapped in over the drawer body once an order is placed.
 *
 * Only orders that need no gateway land here — cash, a full-wallet order, or a
 * gateway whose SDK runs in a modal (Razorpay, Stripe). Gateways that redirect
 * off-site come back on `/web-payment-status` instead, which has to stay a real
 * page for exactly that reason.
 */
const OrderSuccessView = ({ orderId, eta, onContinue, onViewOrder }: OrderSuccessViewProps) => (
  <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
    <div className="mb-5 flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[var(--status-success-background)]">
      <FaCheck size={32} className="text-[var(--status-success-foreground)]" />
    </div>
    <h3 className="mb-2 text-[19px] font-extrabold text-[var(--foreground-primary)]">
      {t("order_placed_title")}
    </h3>
    {eta && (
      <p className="text-[13.5px] leading-relaxed text-[var(--foreground-tertiary)]">
        {eta}
      </p>
    )}
    <p className="text-[13.5px] leading-relaxed text-[var(--foreground-tertiary)]">
      {t("order_confirmation_sent")}
    </p>
    {orderId != null && orderId !== "" && (
      <div className="mt-4 rounded-full bg-[var(--surface-subtle)] px-4 py-2 text-[12.5px] font-semibold text-[var(--foreground-tertiary)]">
        {`${t("order_number")} #${orderId}`}
      </div>
    )}
    <div className="mt-6 flex w-full flex-col gap-2">
      {orderId != null && orderId !== "" && (
        <button
          type="button"
          onClick={onViewOrder}
          className="w-full rounded-lg bg-[var(--button-primary-background-default)] px-6 py-3 text-[13.5px] font-extrabold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
        >
          {t("view_details")}
        </button>
      )}
      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-lg px-6 py-3 text-[13.5px] font-extrabold text-[var(--button-outline-foreground-default)] outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] transition-colors hover:bg-[var(--button-outline-background-hover)]"
      >
        {t("continue_shopping")}
      </button>
    </div>
  </div>
);

export default OrderSuccessView;
