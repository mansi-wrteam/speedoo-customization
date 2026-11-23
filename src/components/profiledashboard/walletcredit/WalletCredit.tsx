import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { blockedReasonKey } from "@/utils/credit";
import * as api from "@/api/apiRoutes";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import type { CreditStatusData, Installment } from "@/types/models";
import CreditApplication from "../credit/CreditApplication";
import CreditDashboard from "../credit/CreditDashboard";
import CreditInstallments from "../credit/CreditInstallments";
import CreditPayModal from "../credit/CreditPayModal";
import { useMoney } from "../credit/useMoney";
import WalletCard from "./WalletCard";
import CreditSummaryCard from "./CreditSummaryCard";
import WalletCreditHistory from "./WalletCreditHistory";

const WalletCredit = () => {
  const money = useMoney();
  const { query } = useLocalizedRouter();
  const orderIdParam = typeof query?.order_id === "string" ? query.order_id : undefined;
  const [data, setData] = useState<CreditStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showInstallments, setShowInstallments] = useState(!!orderIdParam);
  const [payItem, setPayItem] = useState<Installment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await api.getCreditStatus();
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
    fetchStatus();
  }, [fetchStatus]);

  const handlePaid = () => {
    setRefreshKey((key) => key + 1);
    fetchStatus();
  };

  const approved = data?.credit_status === "approved" && !!data.account;
  const blockedKey = data ? blockedReasonKey(data.purchase_blocked_reason) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-medium leading-7 text-[var(--foreground-primary)]">{t("wallet_and_credit")}</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">{t("wallet_and_credit_desc")}</p>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${approved ? "sm:grid-cols-2" : ""}`}>
        <WalletCard />
        {loading ? (
          <CardSkeleton height={180} />
        ) : approved && data?.account ? (
          <CreditSummaryCard account={data.account} />
        ) : null}
      </div>

      {data?.has_overdue && approved && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {t("credit_overdue_amount")}: {money(data.overdue_amount)}
        </div>
      )}
      {approved && blockedKey && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t(blockedKey)}</div>}

      {!loading && (failed || !data) && (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--border-subtle)] p-4">
          <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_load_failed")}</p>
          <button type="button" onClick={fetchStatus} className="text-sm text-[var(--brand-foreground-default)] underline">
            {t("retry")}
          </button>
        </div>
      )}

      {!loading && data && !approved && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 text-base font-medium text-[var(--foreground-primary)]">
            {t("credit")}
          </div>
          <CreditApplication data={data} onRefresh={fetchStatus} />
        </div>
      )}

      {approved && showInstallments && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-medium text-[var(--foreground-primary)]">{t("credit_installments")}</h3>
            <button
              type="button"
              onClick={() => setShowInstallments(false)}
              className="text-sm text-[var(--brand-foreground-default)] underline"
            >
              {t("back")}
            </button>
          </div>
          <CreditInstallments key={refreshKey} initialOrderId={orderIdParam} onPay={setPayItem} />
        </div>
      )}

      {approved && !showInstallments && (
        <CreditDashboard key={`dash-${refreshKey}`} onPay={setPayItem} onSeeAll={() => setShowInstallments(true)} />
      )}

      {!showInstallments && <WalletCreditHistory key={`hist-${refreshKey}`} showCredit={approved} />}

      <CreditPayModal installment={payItem} onClose={() => setPayItem(null)} onPaid={handlePaid} />
    </div>
  );
};

export default WalletCredit;
