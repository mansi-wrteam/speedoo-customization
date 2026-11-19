import { t } from "@/utils/translation";
import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/types/state";
import type { WalletTransaction } from "@/types/models";

export interface WalletTransactionCardProps {
  transaction: WalletTransaction;
}

const WalletTransactionCard = ({ transaction }: WalletTransactionCardProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const isCredit = transaction?.type == "credit";

  return (
    <div className="h-full overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      {/* Header: Transaction ID and Date */}
      <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] p-4">
        <div className="flex flex-col justify-center gap-1">
          <p className="text-nowrap text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
            {t("transaction_id")}
          </p>
          <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
            {transaction?.id}
          </p>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 text-left md:items-end md:text-right">
          <p className="break-words text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
            {t("date")}
          </p>
          <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
            {transaction?.created_at}
          </p>
        </div>
      </div>

      {/* Message Section */}
      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
          {t("message")}
        </p>
        <p className="line-clamp-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
          {transaction?.message}
        </p>
      </div>

      {/* Transaction Amount Section */}
      <div className="flex items-center justify-between gap-2 bg-[var(--surface-subtle)] p-4">
        <div className="flex flex-1 flex-col justify-center gap-1">
          <p className="line-clamp-1 text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
            {t("transaction")} {t("amount")}
          </p>
          <p className="line-clamp-1 text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
            {setting?.currency}
            {transaction?.amount?.toFixed(
              setting?.decimal_point ? setting?.decimal_point as number : 0
            )}
          </p>
        </div>
        <div className="flex flex-col items-end justify-center gap-1">
          <span
            className={`inline-flex items-center justify-center rounded-lg p-2 text-center text-sm font-semibold leading-5 outline outline-1 -outline-offset-1 ${
              isCredit
                ? "bg-[var(--status-success-background)] text-[var(--status-success-foreground)] outline-[var(--status-success-border)]"
                : "bg-[var(--status-error-background)] text-[var(--status-error-foreground)] outline-[var(--status-error-border)]"
            }`}
          >
            {isCredit ? t("credit") : t("debit")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WalletTransactionCard;
