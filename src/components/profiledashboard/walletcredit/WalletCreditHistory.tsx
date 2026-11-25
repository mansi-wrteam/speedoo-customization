import React, { useState } from "react";
import { t } from "@/utils/translation";
import CreditLedger from "../credit/CreditLedger";
import CreditPayments from "../credit/CreditPayments";
import ActivityList from "./ActivityList";
import WalletTransactions from "./WalletTransactions";

type Source = "wallet" | "credit" | "repayments";
type Filter = "all" | Source;

export interface WalletCreditHistoryProps {
  /** Credit lists are only shown to users with an approved credit account. */
  showCredit: boolean;
}

const WalletCreditHistory = ({ showCredit }: WalletCreditHistoryProps) => {
  const [filter, setFilter] = useState<Filter>("all");

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "wallet", label: t("wallet") },
    ...(showCredit
      ? [
          { id: "credit" as const, label: t("credit") },
          { id: "repayments" as const, label: t("credit_payments") },
        ]
      : []),
  ];

  const sections: { id: Source; title: string; list: (limit?: number) => React.ReactNode }[] = [
    { id: "wallet", title: t("wallet_history"), list: (limit) => <WalletTransactions limit={limit} /> },
    ...(showCredit
      ? [
          { id: "credit" as const, title: t("credit_ledger"), list: (limit?: number) => <CreditLedger limit={limit} /> },
          { id: "repayments" as const, title: t("credit_payments"), list: (limit?: number) => <CreditPayments limit={limit} /> },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] p-4">
      <h3 className="text-base font-medium text-[var(--foreground-primary)]">{t("history")}</h3>
      {showCredit && (
        <div className="-me-4 flex gap-2 overflow-x-auto pe-4">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
                filter === item.id
                  ? "border-[var(--brand-foreground-default)] bg-[var(--brand-background-subtle)] text-[var(--brand-foreground-default)]"
                  : "border-[var(--border-subtle)] text-[var(--foreground-secondary)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {filter === "all" && showCredit ? (
        <ActivityList />
      ) : (
        (sections.find((section) => section.id === (filter === "all" ? "wallet" : filter)) ?? sections[0]).list()
      )}
    </div>
  );
};

export default WalletCreditHistory;
