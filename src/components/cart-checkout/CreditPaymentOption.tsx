import React, { useEffect, useMemo, useState } from "react";
import { MdCreditCard } from "react-icons/md";
import { KigenRadio } from "@/components/common/KigenControls";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import { formatDate } from "@/utils/helperFunction";
import { blockedReasonKey } from "@/utils/credit";
import { useMoney } from "@/components/profiledashboard/credit/useMoney";
import type { Id } from "@/types/common";
import type { CreditPlansData, CreditQuoteData } from "@/types/models";

export interface CreditQuoteState {
  quote: CreditQuoteData | null;
  loading: boolean;
}

export interface CreditPaymentOptionProps {
  /** Product ids of the cart; a plan is offered only when it covers all of them. */
  productIds: Id[];
  /** Checkout final total incl. delivery and charges. */
  amount: number;
  selected: boolean;
  onSelect: () => void;
  planId: Id | null;
  onPlanChange: (planId: Id | null) => void;
  onQuoteChange: (state: CreditQuoteState) => void;
}

const CreditPaymentOption = ({
  productIds,
  amount,
  selected,
  onSelect,
  planId,
  onPlanChange,
  onQuoteChange,
}: CreditPaymentOptionProps) => {
  const money = useMoney();
  const [data, setData] = useState<CreditPlansData | null>(null);
  const [quote, setQuote] = useState<CreditQuoteData | null>(null);
  const productKey = useMemo(() => [...new Set(productIds.map(String))].sort().join(","), [productIds]);

  useEffect(() => {
    if (!productKey || !(amount > 0)) return;
    let cancelled = false;
    api
      .getCreditPlans({ productIds: productKey.split(","), amount })
      .then((response) => {
        if (cancelled) return;
        setData(response.status == 1 ? response.data : null);
      })
      .catch((error) => {
        console.log("Error", error);
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [productKey, amount]);

  useEffect(() => {
    if (!selected || planId == null || !(amount > 0)) {
      setQuote(null);
      onQuoteChange({ quote: null, loading: false });
      return;
    }
    let cancelled = false;
    onQuoteChange({ quote: null, loading: true });
    api
      .getCreditQuote({ installmentPlanId: planId, amount, productIds: productKey.split(",") })
      .then((response) => {
        if (cancelled) return;
        const next = response.status == 1 ? response.data : null;
        setQuote(next);
        onQuoteChange({ quote: next, loading: false });
      })
      .catch((error) => {
        console.log("Error", error);
        if (cancelled) return;
        setQuote(null);
        onQuoteChange({ quote: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, planId, amount, productKey]);

  // A plan that stops covering the cart (items changed) must not stay selected.
  useEffect(() => {
    if (data && planId != null && !data.plans.some((plan) => String(plan.id) === String(planId))) {
      onPlanChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data) return null;
  const blockedKey = blockedReasonKey(data.purchase_blocked_reason);
  if (data.purchase_blocked_reason === "credit_account_not_found") return null;
  if (data.plans.length === 0 && !blockedKey) return null;
  const disabled = Boolean(blockedKey) || data.plans.length === 0;

  return (
    <div className={disabled ? "opacity-60" : ""}>
      <label
        data-method="Credit"
        className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors ${
          disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-[var(--surface-subtle)]"
        }`}
      >
        <KigenRadio
          name="drawer_payment_method"
          checked={selected}
          disabled={disabled}
          onChange={() => !disabled && onSelect()}
        />
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)]">
          <MdCreditCard size={20} className="text-[var(--brand-foreground-default)]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-bold text-[var(--foreground-primary)]">
            {t("credit_payment_label")}
          </span>
          <span className="truncate text-[11.5px] text-[var(--foreground-tertiary)]">
            {blockedKey ? t(blockedKey) : `${t("credit_available")} ${money(data.available_credit)}`}
          </span>
        </span>
      </label>

      {selected && !disabled && (
        <div className="mb-2 ms-9 flex flex-col gap-2 pe-2">
          <span className="text-[11.5px] font-bold text-[var(--foreground-secondary)]">
            {t("credit_choose_plan")}
          </span>
          {data.plans.map((plan) => (
            <label
              key={plan.id}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border-subtle)] p-2"
            >
              <KigenRadio
                name="credit_plan"
                checked={String(planId) === String(plan.id)}
                onChange={() => onPlanChange(plan.id)}
              />
              <span className="flex min-w-0 flex-1 flex-col text-[12px] text-[var(--foreground-primary)]">
                <b>{plan.name}</b>
                {plan.quote && (
                  <span className="text-[var(--foreground-tertiary)]">
                    {plan.quote.schedule.length} × {money(plan.quote.schedule[0]?.amount)} · {t("credit_fee")}{" "}
                    {money(plan.quote.fee)} · {t("credit_total_payable")} {money(plan.quote.total_payable)}
                  </span>
                )}
              </span>
            </label>
          ))}

          {quote && (
            <div className="flex flex-col gap-1 rounded-lg bg-[var(--surface-subtle)] p-2 text-[12px]">
              {quote.schedule.map((item) => (
                <div key={item.installment_no} className="flex justify-between">
                  <span>
                    {t("credit_installment")} {item.installment_no} · {formatDate(item.due_date)}
                  </span>
                  <b>{money(item.amount)}</b>
                </div>
              ))}
              {!quote.within_limit && (
                <p className="mt-1 font-semibold text-[var(--status-error-default)]">
                  {t("insufficient_credit_limit")} ({t("credit_available")} {money(quote.available_credit)})
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditPaymentOption;
