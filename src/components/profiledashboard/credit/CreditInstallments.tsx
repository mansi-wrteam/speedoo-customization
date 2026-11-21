import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import type { Id } from "@/types/common";
import type { Installment, InstallmentStatus } from "@/types/models";
import InstallmentRow from "./InstallmentRow";
import CreditOrderSchedule from "./CreditOrderSchedule";

type Filter = InstallmentStatus | "upcoming" | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "all" },
  { id: "upcoming", label: "credit_upcoming_filter" },
  { id: "pending", label: "credit_st_pending" },
  { id: "partial", label: "credit_st_partial" },
  { id: "overdue", label: "credit_st_overdue" },
  { id: "paid", label: "credit_st_paid" },
];
const PAGE_SIZE = 10;

export interface CreditInstallmentsProps {
  initialOrderId?: Id;
  onPay?: (item: Installment) => void;
}

const CreditInstallments = ({ initialOrderId, onPay }: CreditInstallmentsProps) => {
  const [filter, setFilter] = useState<Filter>("all");
  const [orderId, setOrderId] = useState<Id | null>(initialOrderId ?? null);
  const [items, setItems] = useState<Installment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchPage = useCallback(async (nextFilter: Filter, nextPage: number) => {
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    setFailed(false);
    try {
      const response = await api.getCreditInstallments({
        status: nextFilter === "all" ? undefined : nextFilter,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      if (response.status == 1) {
        setItems((prev) => (nextPage === 1 ? response.data : [...prev, ...response.data]));
        setTotal(response.total ?? 0);
        setPage(nextPage);
      } else {
        if (nextPage === 1) setItems([]);
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
    if (orderId === null) fetchPage(filter, 1);
  }, [filter, orderId, fetchPage]);

  if (orderId !== null) {
    return <CreditOrderSchedule orderId={orderId} onBack={() => setOrderId(null)} onPay={onPay} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === item.id
                ? "border-[var(--brand-foreground-default)] bg-[var(--brand-background-subtle)] text-[var(--brand-foreground-default)]"
                : "border-[var(--border-subtle)] text-[var(--foreground-secondary)]"
            }`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {loading ? (
        <CardSkeleton height={200} />
      ) : failed && items.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_load_failed")}</p>
          <button type="button" onClick={() => fetchPage(filter, 1)} className="text-sm text-[var(--brand-foreground-default)] underline">
            {t("retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_no_installments")}</p>
      ) : (
        <>
          {items.map((item) => (
            <InstallmentRow key={item.id} item={item} onPay={onPay} onViewOrder={setOrderId} />
          ))}
          {total > items.length && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchPage(filter, page + 1)}
                className="rounded-lg bg-[var(--button-secondary-background-default)] px-4 py-2 text-base font-medium text-[var(--button-secondary-foreground-default)] disabled:opacity-50"
              >
                {loadingMore ? t("loading") : t("load_more")}
              </button>
            </div>
          )}
        </>
      )}
      <p className="text-xs text-[var(--foreground-secondary)]">{t("credit_cash_info")}</p>
    </div>
  );
};

export default CreditInstallments;
