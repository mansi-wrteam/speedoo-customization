import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import type { CreditDashboardData, Installment } from "@/types/models";
import InstallmentRow from "./InstallmentRow";

const Count = ({ label, value, danger }: { label: string; value: number; danger?: boolean }) => (
  <div className="rounded-xl bg-[var(--surface-subtle)] p-3 text-center">
    <div className="text-xs text-[var(--foreground-secondary)]">{label}</div>
    <div className={`text-lg font-semibold ${danger && value > 0 ? "text-red-600" : "text-[var(--foreground-primary)]"}`}>
      {value}
    </div>
  </div>
);

export interface CreditDashboardProps {
  /** Omit to hide the "Pay now" buttons. */
  onPay?: (item: Installment) => void;
  onSeeAll?: () => void;
}

const CreditDashboard = ({ onPay, onSeeAll }: CreditDashboardProps) => {
  const [data, setData] = useState<CreditDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await api.getCreditDashboard();
      if (response.status == 1) {
        setData(response.data);
      } else {
        setFailed(true);
      }
    } catch (error) {
      console.log("Error", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <CardSkeleton height={160} />;

  if (failed || !data) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_load_failed")}</p>
        <button type="button" onClick={fetchDashboard} className="text-sm text-[var(--brand-foreground-default)] underline">
          {t("retry")}
        </button>
      </div>
    );
  }

  const upcoming = [data.next_due, ...data.upcoming.filter((item) => item.id !== data.next_due?.id)].filter(
    (item): item is Installment => !!item
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 sm:grid-cols-4">
        <Count label={t("credit_active_plans")} value={data.active_plans} />
        <Count label={t("credit_paid_installments")} value={data.paid_installments} />
        <Count label={t("credit_unpaid_installments")} value={data.unpaid_installments} />
        <Count label={t("credit_overdue_installments")} value={data.overdue_installments} danger />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-medium text-[var(--foreground-primary)]">{t("credit_upcoming")}</h3>
          {onSeeAll && (
            <button type="button" onClick={onSeeAll} className="text-sm text-[var(--brand-foreground-default)] underline">
              {t("see_all")}
            </button>
          )}
        </div>
        {upcoming.length > 0 ? (
          upcoming.map((item) => <InstallmentRow key={item.id} item={item} onPay={onPay} />)
        ) : (
          <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_no_upcoming")}</p>
        )}
      </div>
    </>
  );
};

export default CreditDashboard;
