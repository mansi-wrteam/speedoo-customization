import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import { formatDate } from "@/utils/helperFunction";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import { useMoney } from "@/components/profiledashboard/credit/useMoney";
import type { CouponHistoryEntry } from "@/types/models";

const PAGE_SIZE = 15;

const CouponHistory = () => {
  const money = useMoney();
  const [items, setItems] = useState<CouponHistoryEntry[]>([]);
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
      const response = await api.getCouponHistory({ page: nextPage, limit: PAGE_SIZE });
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

  return (
    <div className="w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
        <h2 className="flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]">{t("coupon_history")}</h2>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {loading ? (
          <CardSkeleton height={200} />
        ) : failed && items.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-[var(--foreground-secondary)]">{t("coupon_history_load_failed")}</p>
            <button type="button" onClick={() => fetchPage(1)} className="text-sm text-[var(--brand-foreground-default)] underline">
              {t("retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--foreground-secondary)]">{t("coupon_no_history")}</p>
        ) : (
          <>
            {items.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium tracking-wide text-[var(--foreground-primary)]">{entry.code}</div>
                  <div className="text-xs text-[var(--foreground-secondary)]">
                    {formatDate(entry.redeemed_at)}
                    {entry.wallet_transaction_id ? ` · ${t("coupon_wallet_ref")} #${entry.wallet_transaction_id}` : ""}
                  </div>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                  {entry.status === "success" ? t("coupon_status_success") : entry.status}
                </span>
                <div className="text-sm font-semibold text-green-600">+{money(entry.amount)}</div>
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
          </>
        )}
      </div>
    </div>
  );
};

export default CouponHistory;
