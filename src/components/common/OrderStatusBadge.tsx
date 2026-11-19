import React from "react";
import { t } from "@/utils/translation";

export type OrderStatusTone = "success" | "error" | "warning" | "information";

export interface OrderStatusInfo {
  tone: OrderStatusTone;
  /** Translation key. */
  label: string;
}

export interface OrderStatusBadgeProps {
  /** `active_status` code (callers pass `Number(order?.active_status)`). */
  status: number;
  className?: string;
}

const TONE_CLASSES: Record<OrderStatusTone, string> = {
  success:
    "bg-[var(--status-success-background)] text-[var(--status-success-foreground)] outline-[var(--status-success-border)]",
  error:
    "bg-[var(--status-error-background)] text-[var(--status-error-foreground)] outline-[var(--status-error-border)]",
  warning:
    "bg-[var(--status-warning-background)] text-[var(--status-warning-foreground)] outline-[var(--status-warning-border)]",
  information:
    "bg-[var(--status-information-background)] text-[var(--status-information-foreground)] outline-[var(--status-information-border)]",
};

/**
 * `active_status` codes as returned by the orders API, mapped to a status tone
 * and its translation key. Kept here so every order surface (active orders,
 * order history, order detail) renders the same badge.
 */
export const ORDER_STATUS: Record<number, OrderStatusInfo> = {
  1: { tone: "warning", label: "paymentPending" },
  2: { tone: "information", label: "order_status_display_name_recieved" },
  3: { tone: "information", label: "processed" },
  4: { tone: "information", label: "order_status_display_name_shipped" },
  5: { tone: "success", label: "out_for_delivery" },
  6: { tone: "success", label: "order_status_display_name_delivered" },
  7: { tone: "error", label: "cancelled" },
  8: { tone: "error", label: "returned" },
  9: { tone: "warning", label: "order_in_process" },
  10: { tone: "information", label: "ready_to_pickup" },
};

const FALLBACK = ORDER_STATUS[8];

const OrderStatusBadge = ({ status, className = "" }: OrderStatusBadgeProps) => {
  const { tone, label } = ORDER_STATUS[status] ?? FALLBACK;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg p-2 text-center text-sm font-semibold leading-5 outline outline-1 -outline-offset-1 ${TONE_CLASSES[tone]} ${className}`}
    >
      {t(label)}
    </span>
  );
};

export default OrderStatusBadge;
