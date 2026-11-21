import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/utils/translation";
import { useLocalizedRouter } from "@/utils/localizedNav";
import * as api from "@/api/apiRoutes";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import type { CreditStatusData, Installment } from "@/types/models";
import CreditOverview from "./CreditOverview";
import CreditInstallments from "./CreditInstallments";
import CreditPayModal from "./CreditPayModal";
import CreditLedger from "./CreditLedger";
import CreditPayments from "./CreditPayments";

const ALL_TABS = [
  { id: "overview", label: "credit_overview" },
  { id: "installments", label: "credit_installments" },
  { id: "ledger", label: "credit_ledger" },
  { id: "payments", label: "credit_payments" },
] as const;

const Credit = () => {
  const { query } = useLocalizedRouter();
  const orderIdParam = typeof query?.order_id === "string" ? query.order_id : undefined;
  const [tab, setTab] = useState<(typeof ALL_TABS)[number]["id"]>(orderIdParam ? "installments" : "overview");
  const [data, setData] = useState<CreditStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [payItem, setPayItem] = useState<Installment | null>(null);

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

  const tabs = data?.credit_status === "approved" ? ALL_TABS : ALL_TABS.slice(0, 1);
  const activeTab = tabs.some((item) => item.id === tab) ? tab : "overview";

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
        <h2 className="flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]">{t("credit")}</h2>
      </div>
      {tabs.length > 1 && (
        <div className="flex gap-4 border-b border-[var(--border-subtle)] px-4">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`py-3 text-sm ${activeTab === item.id ? "border-b-2 border-[var(--brand-foreground-default)] text-[var(--brand-foreground-default)]" : "text-[var(--foreground-secondary)]"}`}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <div className="p-4">
          <CardSkeleton height={200} />
        </div>
      ) : failed || !data ? (
        <div className="flex flex-col items-start gap-2 p-4">
          <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_load_failed")}</p>
          <button type="button" onClick={fetchStatus} className="text-sm text-[var(--brand-foreground-default)] underline">
            {t("retry")}
          </button>
        </div>
      ) : (
        <>
          {activeTab === "overview" && <CreditOverview data={data} onRefresh={fetchStatus} onPay={setPayItem} />}
          {activeTab === "ledger" && (
            <div className="p-4">
              <CreditLedger />
            </div>
          )}
          {activeTab === "payments" && (
            <div className="p-4">
              <CreditPayments />
            </div>
          )}
          {activeTab === "installments" && (
            <div className="p-4">
              <CreditInstallments initialOrderId={orderIdParam} onPay={setPayItem} />
            </div>
          )}
        </>
      )}
      <CreditPayModal installment={payItem} onClose={() => setPayItem(null)} onPaid={fetchStatus} />
    </div>
  );
};

export default Credit;
