import React from "react";
import { t } from "@/utils/translation";
import { blockedReasonKey } from "@/utils/credit";
import type { CreditStatusData, Installment } from "@/types/models";
import CreditApplyForm from "./CreditApplyForm";
import CreditDashboard from "./CreditDashboard";
import { useMoney } from "./useMoney";

export interface CreditOverviewProps {
  data: CreditStatusData;
  onRefresh: () => void;
  onPay?: (item: Installment) => void;
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[var(--border-subtle)] p-4">
    <div className="text-sm text-[var(--foreground-secondary)]">{label}</div>
    <div className="text-xl font-semibold text-[var(--foreground-primary)]">{value}</div>
  </div>
);

const CreditOverview = ({ data, onRefresh, onPay }: CreditOverviewProps) => {
  const money = useMoney();
  const { credit_status: status, account, application } = data;
  const blockedKey = blockedReasonKey(data.purchase_blocked_reason);

  if (status === "approved" && account) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label={t("credit_limit")} value={money(account.credit_limit)} />
          <Stat label={t("credit_outstanding")} value={money(account.outstanding_amount)} />
          <Stat label={t("credit_available")} value={money(account.available_credit)} />
        </div>
        <div className="text-sm text-[var(--foreground-secondary)]">
          {t("status")}:{" "}
          <span className="font-medium text-[var(--foreground-primary)]">
            {account.status === "suspended" ? t("credit_status_suspended") : t("credit_status_active")}
          </span>
        </div>
        {data.has_overdue && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {t("credit_overdue_amount")}: {money(data.overdue_amount)}
          </div>
        )}
        {blockedKey && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t(blockedKey)}</div>}
        <CreditDashboard onPay={onPay} />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-lg font-medium text-[var(--foreground-primary)]">{t("credit_under_review")}</h3>
        <p className="text-sm text-[var(--foreground-secondary)]">{t("credit_under_review_desc")}</p>
        {application?.documents?.length ? (
          <ul className="flex flex-col gap-1 text-sm">
            {application.documents.map((doc, index) => (
              <li key={`${doc.url}-${index}`}>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-foreground-default)] underline">
                  {doc.type}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {status === "rejected" && (
        <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <div className="font-medium">{t("credit_rejected_title")}</div>
          {application?.admin_note && (
            <div>
              {t("credit_admin_note")}: {application.admin_note}
            </div>
          )}
        </div>
      )}
      {data.can_apply ? (
        <CreditApplyForm onSubmitted={onRefresh} />
      ) : (
        blockedKey && <div className="p-4 text-sm text-[var(--foreground-secondary)]">{t(blockedKey)}</div>
      )}
    </div>
  );
};

export default CreditOverview;
