import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import { formatDate } from "@/utils/helperFunction";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import type { CreditLedgerEntry } from "@/types/models";
import { useMoney } from "./useMoney";

const PAGE_SIZE = 15;

const CreditLedger = () => {
  const money = useMoney();
  const [items, setItems] = useState<CreditLedgerEntry[]>([]);
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
      const response = await api.getCreditLedger({ page: nextPage, limit: PAGE_SIZE });
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
    return <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_no_ledger")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((entry, index) => {
        const isDebit = entry.direction === "debit";
        return (
          <div
            key={entry.id ?? `${entry.created_at}-${index}`}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--foreground-primary)]">
                {t(`credit_entry_${entry.entry_type}`)}
                {entry.order_id ? ` · ${t("order")} #${entry.order_id}` : ""}
              </div>
              <div className="text-xs text-[var(--foreground-secondary)]">
                {formatDate(entry.created_at)}
                {entry.note ? ` · ${entry.note}` : ""}
                {entry.reference ? ` · ${entry.reference}` : ""}
              </div>
            </div>
            <div className="text-end">
              <div className={`text-sm font-semibold ${isDebit ? "text-red-600" : "text-green-600"}`}>
                {isDebit ? "+" : "−"}
                {money(entry.amount)}
              </div>
              <div className="text-xs text-[var(--foreground-secondary)]">
                {t("credit_outstanding_after")}: {money(entry.outstanding_after)}
              </div>
            </div>
          </div>
        );
      })}
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

export default CreditLedger;
