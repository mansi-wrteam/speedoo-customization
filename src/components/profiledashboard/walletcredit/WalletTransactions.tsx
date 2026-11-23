import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import { useMoney } from "../credit/useMoney";
import type { WalletTransaction } from "@/types/models";

const PAGE_SIZE = 10;

export interface WalletTransactionsProps {
  /** Show only the latest N rows, without Load More. */
  limit?: number;
}

const WalletTransactions = ({ limit }: WalletTransactionsProps) => {
  const money = useMoney();
  const pageSize = limit ?? PAGE_SIZE;
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchPage = useCallback(
    async (offset: number) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setFailed(false);
      try {
        const response = await api.getUserTransactions({ limit: pageSize, offset, type: "wallet" });
        if (response.status == 1) {
          setItems((prev) => (offset === 0 ? response.data : [...prev, ...response.data]));
          setTotal(response.total ?? 0);
        } else if (offset === 0) {
          setItems([]);
          setTotal(0);
        }
      } catch (error) {
        console.log("Error", error);
        setFailed(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  if (loading) return <CardSkeleton height={200} />;

  if (failed && items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_load_failed")}</p>
        <button type="button" onClick={() => fetchPage(0)} className="text-sm text-[var(--brand-foreground-default)] underline">
          {t("retry")}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-[var(--foreground-secondary)]">{t("no_transaction")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const isCredit = item.type == "credit";
        return (
          <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--foreground-primary)]">{item.message}</div>
              <div className="text-xs text-[var(--foreground-secondary)]">
                {t("transaction_id")} {item.id} · {item.created_at}
              </div>
            </div>
            <div className={`text-sm font-semibold ${isCredit ? "text-green-600" : "text-[var(--foreground-primary)]"}`}>
              {isCredit ? "+" : "−"}
              {money(item.amount)}
            </div>
          </div>
        );
      })}
      {!limit && total > items.length && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => fetchPage(items.length)}
            className="rounded-lg bg-[var(--button-secondary-background-default)] px-4 py-2 text-base font-medium text-[var(--button-secondary-foreground-default)] disabled:opacity-50"
          >
            {loadingMore ? t("loading") : t("load_more")}
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletTransactions;
