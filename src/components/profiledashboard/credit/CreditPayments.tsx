import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import { formatDate } from "@/utils/helperFunction";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import type { CreditPayment, CreditPaymentStatus } from "@/types/models";
import { useMoney } from "./useMoney";

const PAGE_SIZE = 15;
const STATUS_BADGE: Record<CreditPaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const CreditPayments = () => {
  const money = useMoney();
  const [items, setItems] = useState<CreditPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchPage = useCallback(async (nextPage: number) => {
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    setFailed(false);
    try {
      const response = await api.getCreditPayments({ page: nextPage, limit: PAGE_SIZE });
      if (response.status == 1) {
        setItems((prev) => (nextPage === 1 ? response.data : [...prev, ...response.data]));
        setTotal(response.total ?? 0);
        setPage(nextPage);
      } else {
        setFailed(true);
      }
    } catch (error) {
      console.log("Error", error);
      setFailed(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  if (loading) return <CardSkeleton height={200} />;

  if (failed && items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_load_failed")}</p>
        <button type="button" onClick={() => fetchPage(1)} className="text-sm text-[var(--brand-foreground-default)] underline">
          {t("retry")}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_no_payments")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((payment) => (
        <div key={payment.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--foreground-primary)]">
              {t(payment.method === "cash" ? "credit_method_cash" : "credit_method_wallet")}
              {payment.receipt_no ? ` · ${payment.receipt_no}` : ""}
            </div>
            <div className="text-xs text-[var(--foreground-secondary)]">
              {payment.created_at ? formatDate(payment.created_at) : ""}
              {payment.note ? ` · ${payment.note}` : ""}
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[payment.status]}`}>
            {t(`credit_pay_${payment.status}`)}
          </span>
          <div className="text-sm font-semibold text-[var(--foreground-primary)]">{money(payment.amount)}</div>
        </div>
      ))}
      {total > items.length && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => fetchPage(page + 1)}
            className="rounded-lg bg-[var(--button-secondary-background-default)] px-4 py-2 text-base font-medium text-[var(--button-secondary-foreground-default)] disabled:opacity-50"
          >
            {loadingMore ? t("loading") : t("load_more")}
          </button>
        </div>
      )}
    </div>
  );
};

export default CreditPayments;
