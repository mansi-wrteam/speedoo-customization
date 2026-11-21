import React, { useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import { formatDate } from "@/utils/helperFunction";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import type { Id } from "@/types/common";
import type { CreditOrderDetailData, Installment } from "@/types/models";
import InstallmentRow from "./InstallmentRow";
import { useMoney } from "./useMoney";

export interface CreditOrderScheduleProps {
  orderId: Id;
  onBack?: () => void;
  onPay?: (item: Installment) => void;
}

const CreditOrderSchedule = ({ orderId, onBack, onPay }: CreditOrderScheduleProps) => {
  const money = useMoney();
  const [detail, setDetail] = useState<CreditOrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await api.getCreditOrder({ orderId });
        if (cancelled) return;
        if (response.status == 1 && Array.isArray(response.data?.credit_orders)) {
          setDetail(response.data);
        } else {
          setFailed(true);
        }
      } catch (error) {
        console.log("Error", error);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div className="flex flex-col gap-4">
      {onBack && (
        <button type="button" onClick={onBack} className="self-start text-sm text-[var(--brand-foreground-default)] underline">
          {t("credit_back")}
        </button>
      )}
      <h3 className="text-lg font-medium text-[var(--foreground-primary)]">
        {t("credit_order_schedule")} · {t("order")} #{orderId}
      </h3>
      {loading ? (
        <CardSkeleton height={200} />
      ) : failed || !detail ? (
        <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_load_failed")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--surface-subtle)] p-3 text-sm">
            <b>{detail.plan?.name}</b>
            <span>
              {t("credit_principal")}: {money(detail.principal)} · {t("credit_fee")}: {money(detail.fee)} ·{" "}
              {t("credit_total_payable")}: <b>{money(detail.total_payable)}</b>
            </span>
          </div>

          {detail.credit_orders.map((order) => {
            const paid = order.installments.reduce((sum, item) => sum + Number(item.paid_amount ?? 0), 0);
            return (
              <div key={order.credit_order_id} className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-[var(--foreground-secondary)]">
                    {order.seller_name || `${t("seller")} #${order.seller_id}`}
                  </span>
                  <span className="text-[var(--foreground-primary)]">
                    {t("credit_total_payable")}: <b>{money(order.total_payable)}</b> · {t("credit_paid_amount")}:{" "}
                    <b>{money(paid)}</b>
                  </span>
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs">
                    {t(`credit_order_${order.status}`)}
                  </span>
                </div>
                {order.installments.map((item) => (
                  <InstallmentRow key={item.id} item={{ ...item, order_id: detail.order_id }} onPay={onPay} />
                ))}
              </div>
            );
          })}

          {detail.payments.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-medium text-[var(--foreground-primary)]">{t("credit_payments")}</h4>
              {detail.payments.map((payment) => (
                <div key={payment.id} className="text-xs text-[var(--foreground-secondary)]">
                  {t(payment.method === "cash" ? "credit_method_cash" : "credit_method_wallet")} · {money(payment.amount)} ·{" "}
                  {t(`credit_pay_${payment.status}`)}
                  {payment.receipt_no && ` · ${payment.receipt_no}`}
                  {payment.created_at && ` · ${formatDate(payment.created_at)}`}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CreditOrderSchedule;
