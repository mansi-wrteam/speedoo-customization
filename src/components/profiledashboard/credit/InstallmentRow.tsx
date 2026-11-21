import React from "react";
import { t } from "@/utils/translation";
import { formatDate } from "@/utils/helperFunction";
import { INSTALLMENT_STATUS_BADGE, installmentRemaining } from "@/utils/credit";
import type { Installment } from "@/types/models";
import { useMoney } from "./useMoney";

export interface InstallmentRowProps {
  item: Installment;
  /** Omit to hide the "Pay now" button. */
  onPay?: (item: Installment) => void;
  /** Omit to render the order number as plain text. */
  onViewOrder?: (orderId: Installment["order_id"]) => void;
}

const InstallmentRow = ({ item, onPay, onViewOrder }: InstallmentRowProps) => {
  const money = useMoney();
  const remaining = installmentRemaining(item.amount, item.paid_amount);
  const canPay = onPay && (item.status === "pending" || item.status === "partial" || item.status === "overdue");
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[var(--foreground-primary)]">
          {onViewOrder ? (
            <button type="button" onClick={() => onViewOrder(item.order_id)} className="underline">
              {t("order")} #{item.order_id}
            </button>
          ) : (
            <>
              {t("order")} #{item.order_id}
            </>
          )}{" "}
          · {t("credit_installment")} {item.installment_no}
        </div>
        <div className="text-xs text-[var(--foreground-secondary)]">
          {t("credit_due_on")} {formatDate(item.due_date)}
          {Number(item.paid_amount) > 0 && ` · ${t("credit_paid_amount")} ${money(item.paid_amount)}`}
        </div>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-xs ${INSTALLMENT_STATUS_BADGE[item.status]}`}>
        {t(`credit_st_${item.status}`)}
      </span>
      <div className="text-sm font-semibold text-[var(--foreground-primary)]">
        {money(item.status === "paid" ? item.amount : remaining)}
      </div>
      {canPay && (
        <button
          type="button"
          onClick={() => onPay(item)}
          className="rounded-lg bg-[var(--brand-foreground-default)] px-4 py-1.5 text-sm text-white"
        >
          {t("credit_pay_now")}
        </button>
      )}
    </div>
  );
};

export default InstallmentRow;
