import React from "react";
import Image from "next/image";
import { useSelector } from "react-redux";
import { CiWallet } from "react-icons/ci";
import { MdKeyboardArrowDown, MdOutlinePayment } from "react-icons/md";
import { KigenCheckbox, KigenRadio } from "@/components/common/KigenControls";
import { CASH_IMAGE, enabledGateways, gatewayById } from "./paymentMethods";
import { t } from "@/utils/translation";
import { formatAmount } from "@/lib/utils";
import { walletTopUpShortfall } from "@/utils/cartRowUtils";
import type { PaymentMethod } from "@/types/models";
import type { RootState } from "@/types/state";

export interface PaymentAccordionProps {
  /** Order total before the wallet is applied. */
  total: number;
  walletBalance: number;
  walletChecked: boolean;
  /** The wallet settles the whole order: gateways and cash are hidden. */
  walletCovers: boolean;
  onToggleWallet: () => void;
  /** Opens wallet recharge prefilled with the shortfall. */
  onTopUp: (amount: number) => void;
  method: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  /** `cod_payment_method` AND the charges response both allow it (§1.7). */
  codAllowed: boolean;
  isPickup: boolean;
  /** Controlled so the footer's "select a payment method" warning can open it. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Payment Method, as a collapsed summary row that expands into the list
 * (WEB_PARITY_V4.0.2 §1.7).
 *
 * Gateway names are brand names and are never translated; only "Pay via" is.
 * When the wallet covers the whole order there is nothing left to pay, so the
 * gateways and cash do not render at all.
 */
const PaymentAccordion = ({
  total,
  walletBalance,
  walletChecked,
  walletCovers,
  onToggleWallet,
  onTopUp,
  method,
  onSelectMethod,
  codAllowed,
  isPickup,
  open,
  onOpenChange,
}: PaymentAccordionProps) => {
  const setting = useSelector((state: RootState) => state.Setting);

  const gateways = enabledGateways(setting?.payment_setting);
  const shortfall = walletTopUpShortfall(total, walletBalance);
  const currency = setting?.setting?.currency ?? "";
  const decimals = setting?.setting?.decimal_point;
  const cashLabel = isPickup ? t("pay_on_pickup") : t("pay_on_delivery");

  const selectedLabel = walletCovers
    ? t("use_wallet")
    : method === "COD"
      ? cashLabel
      : gatewayById(method)?.brandName ?? t("select_payment");

  const option = (
    id: PaymentMethod,
    label: string,
    image: React.ComponentProps<typeof Image>["src"],
    sub?: string
  ) => (
    <label
      key={id}
      data-method={id}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--surface-subtle)]"
    >
      <KigenRadio
        name="drawer_payment_method"
        checked={method === id}
        onChange={() => onSelectMethod(id)}
      />
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)]">
        <Image src={image} alt={label} height={20} width={20} unoptimized className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-bold text-[var(--foreground-primary)]">
          {label}
        </span>
        {sub && (
          <span className="truncate text-[11.5px] text-[var(--foreground-tertiary)]">{sub}</span>
        )}
      </span>
    </label>
  );

  return (
    <div className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-[var(--border-default)]">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center gap-3 bg-[var(--surface-subtle)] px-4 py-3 text-left"
      >
        <MdOutlinePayment size={16} className="flex-shrink-0 text-[var(--brand-foreground-default)]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-bold text-[var(--foreground-secondary)]">
            {t("pay_via")}{" "}
            <span className="font-extrabold text-[var(--foreground-primary)]">{selectedLabel}</span>
          </span>
          <span className="text-[11.5px] text-[var(--foreground-tertiary)]">
            {t("tap_to_change_payment")}
          </span>
        </span>
        <MdKeyboardArrowDown
          size={18}
          className={`flex-shrink-0 text-[var(--foreground-secondary)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-2 py-1.5">
          {/* Wallet */}
          <div className="mb-1.5 flex flex-col gap-2 rounded-lg bg-[var(--surface-subtle)] p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-default)]">
                <CiWallet size={18} className="text-[var(--brand-foreground-default)]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-bold text-[var(--foreground-primary)]">
                  {t("wallet")}
                </span>
                <span className="truncate text-[11.5px] text-[var(--foreground-tertiary)]">
                  {walletBalance > 0
                    ? `${t("available_balance")} ${currency}${formatAmount(walletBalance, decimals)}`
                    : t("no_balance")}
                </span>
              </span>
              {/* Hidden at a zero balance — there is nothing to use. */}
              {walletBalance > 0 && (
                <KigenCheckbox checked={walletChecked} onChange={onToggleWallet} />
              )}
            </div>
            {/* Rounds UP: a pill that promised a whole amount must actually cover the order. */}
            {shortfall != null && (
              <button
                type="button"
                onClick={() => onTopUp(shortfall)}
                className="self-start rounded-full bg-[var(--brand-background-subtle)] px-3 py-1.5 text-[11.5px] font-extrabold text-[var(--brand-foreground-default)]"
              >
                {`${t("add")} ${currency}${shortfall}`}
              </button>
            )}
          </div>

          {!walletCovers && (
            <>
              {gateways.map((gateway) =>
                option(gateway.id, gateway.brandName, gateway.image)
              )}
              {codAllowed && (
                <>
                  {gateways.length > 0 && (
                    <div className="my-1.5 flex items-center gap-2.5 px-2">
                      <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[var(--foreground-tertiary)]">
                        {t("or_continue_with")}
                      </span>
                      <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                    </div>
                  )}
                  {option("COD", cashLabel, CASH_IMAGE, t("pay_when_order_arrives"))}
                </>
              )}
              {gateways.length === 0 && !codAllowed && (
                <p className="px-2 py-3 text-[12.5px] text-[var(--foreground-tertiary)]">
                  {t("payment_methods_not_available")}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentAccordion;
