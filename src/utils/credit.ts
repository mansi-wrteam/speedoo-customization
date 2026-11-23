import { t } from "@/utils/translation";
import type { CreditBlockedReason, InstallmentStatus } from "@/types/models";

/** Credit & Installments (Module 1) is shipped separately; `NEXT_PUBLIC_ENABLE_CREDIT=true` turns it on. */
export const isCreditEnabled = (): boolean => process.env.NEXT_PUBLIC_ENABLE_CREDIT === "true";

export const walletCreditTitle = (): string => (isCreditEnabled() ? t("wallet_and_credit") : t("wallet"));

export const INSTALLMENT_STATUS_BADGE: Record<InstallmentStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  partial: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
};

const BLOCKED_REASON_KEYS: readonly string[] = [
  "credit_account_not_found",
  "credit_account_suspended",
  "credit_overdue_installments_block_purchase",
] satisfies CreditBlockedReason[];

/** Translation key for a `purchase_blocked_reason`, or `null` when the user can buy on credit. */
export const blockedReasonKey = (reason: string | null | undefined): string | null =>
  reason && BLOCKED_REASON_KEYS.includes(reason) ? reason : reason ? "credit_purchase_blocked" : null;

export const installmentRemaining = (amount: number | string, paid: number | string): number =>
  Math.max(Number(amount) - Number(paid), 0);

export const isCreditOrder = (paymentMethod: string | null | undefined): boolean =>
  isCreditEnabled() && paymentMethod?.toLowerCase() === "credit";
