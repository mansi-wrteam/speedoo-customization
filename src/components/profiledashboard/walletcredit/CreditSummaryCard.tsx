import React from "react";
import { t } from "@/utils/translation";
import type { CreditAccount } from "@/types/models";
import { useMoney } from "../credit/useMoney";

export interface CreditSummaryCardProps {
  account: CreditAccount;
}

const CreditSummaryCard = ({ account }: CreditSummaryCardProps) => {
  const money = useMoney();
  const limit = Number(account.credit_limit) || 0;
  const used = limit > 0 ? Math.min(100, Math.max(0, (Number(account.outstanding_amount) / limit) * 100)) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="flex items-center justify-between gap-2 text-sm text-[var(--foreground-secondary)]">
        <span>{t("credit_available")}</span>
        {account.status === "suspended" && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">{t("credit_status_suspended")}</span>
        )}
      </div>
      <div className="text-3xl font-bold text-[var(--foreground-primary)]">{money(account.available_credit)}</div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
        <div className="h-full rounded-full bg-[var(--brand-foreground-default)]" style={{ width: `${used}%` }} />
      </div>
      <div className="flex justify-between text-sm text-[var(--foreground-secondary)]">
        <span>
          {t("credit_limit")}
          <b className="block text-base font-semibold text-[var(--foreground-primary)]">{money(account.credit_limit)}</b>
        </span>
        <span className="text-end">
          {t("credit_outstanding")}
          <b className="block text-base font-semibold text-[var(--foreground-primary)]">{money(account.outstanding_amount)}</b>
        </span>
      </div>
    </div>
  );
};

export default CreditSummaryCard;
