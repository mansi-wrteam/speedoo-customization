import React from "react";
import { t } from "@/utils/translation";
import { isCreditOrder } from "@/utils/credit";

const CreditOrderBadge = ({ paymentMethod }: { paymentMethod?: string | null }) =>
  isCreditOrder(paymentMethod) ? (
    <span className="w-fit rounded-full bg-[var(--brand-background-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--brand-foreground-default)]">
      {t("credit_order")}
    </span>
  ) : null;

export default CreditOrderBadge;
