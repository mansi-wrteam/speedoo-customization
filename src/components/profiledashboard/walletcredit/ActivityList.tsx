import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import { useMoney } from "../credit/useMoney";
import type { CustomerActivity } from "@/types/models";

const PAGE_SIZE = 20;

const ActivityList = () => {
  const money = useMoney();
  const [items, setItems] = useState<CustomerActivity[]>([]);
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
      const response = await api.getCustomerActivity({ page: nextPage, limit: PAGE_SIZE });
      if (response.status == 1) {
        setItems((prev) => (nextPage === 1 ? response.data : [...prev, ...response.data]));
        setTotal(response.total ?? 0);
        setPage(nextPage);
      } else if (nextPage === 1) {
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
    return <p className="text-sm text-[var(--foreground-secondary)]">{t("no_transaction")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const isIn = item.direction === "in";
        return (
          <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--foreground-primary)]">{item.title}</div>
              <div className="text-xs text-[var(--foreground-secondary)]">
                {item.order_id ? `${t("order")} #${item.order_id} · ` : ""}
                {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
            <div className={`text-sm font-semibold ${isIn ? "text-green-600" : "text-[var(--foreground-primary)]"}`}>
              {isIn ? "+" : "−"}
              {money(item.amount)}
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

export default ActivityList;
