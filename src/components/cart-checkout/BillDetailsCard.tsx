import React, { useState } from "react";
import { useSelector } from "react-redux";
import { CgInfo } from "react-icons/cg";
import { MdKeyboardArrowDown } from "react-icons/md";
import ChargesInfoPopup from "./ChargesInfoPopup";
import { t } from "@/utils/translation";
import { formatAmount } from "@/lib/utils";
import type { CartData, OrderType } from "@/types/models";
import type { RootState } from "@/types/state";

export interface BillDetailsCardProps {
  /** `getCart({ checkout: 1 }).data`; null until the first charges call. */
  checkoutData: CartData | null;
  /** Charges unavailable (guest, or the call failed): show the plain subtotal. */
  hasError: boolean;
  /** Local subtotal, used while charges are unavailable. */
  fallbackSubTotal?: number;
  orderType: OrderType;
  /** Wallet amount applied to this order, shown as its own deduction row. */
  walletUsed?: number;
  /** Order total after the wallet. */
  payable: number;
  /** Set while Credit is the payment method and a plan is quoted. */
  credit?: { fee: number | string; totalPayable: number | string } | null;
}

/**
 * Bill Details — collapsible, as the design has it. Place Order is not here:
 * committing the order is the drawer footer's job (WEB_PARITY_V4.0.2 §1.7).
 */
const BillDetailsCard = ({
  checkoutData,
  hasError,
  fallbackSubTotal = 0,
  orderType,
  walletUsed = 0,
  payable,
  credit,
}: BillDetailsCardProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const [open, setOpen] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<number | "delivery" | null>(null);
  const [message, setMessage] = useState<React.ReactNode>("");

  const currency = setting?.currency ?? "";
  const decimals = setting?.decimal_point;
  const amount = (value: unknown) => `${currency}${formatAmount(value as number, decimals)}`;
  const subTotal = hasError ? fallbackSubTotal : checkoutData?.sub_total ?? fallbackSubTotal;
  const deliveryCharge = Number(checkoutData?.delivery_charge?.total_delivery_charge ?? 0);

  return (
    // No overflow-hidden here: it clipped the charge info popups. The header
    // rounds its own corners instead.
    <div className="rounded-xl outline outline-1 -outline-offset-1 outline-[var(--border-default)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 bg-[var(--surface-subtle)] px-4 py-3 ${
          open ? "rounded-t-xl" : "rounded-xl"
        }`}
      >
        <span className="text-[13.5px] font-extrabold text-[var(--foreground-primary)]">
          {t("bill_details")}
        </span>
        <MdKeyboardArrowDown
          size={18}
          className={`text-[var(--foreground-secondary)] transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>

      {open && (
        <div className="flex flex-col px-4 pb-3.5 pt-3">
          <div className="flex items-center justify-between py-1 text-[13px] text-[var(--foreground-secondary)]">
            <span>{t("sub_total")}</span>
            <span>{amount(subTotal)}</span>
          </div>

          {checkoutData?.additional_charges?.map((charge, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1 text-[13px] text-[var(--foreground-secondary)]"
            >
              <span className="relative flex items-center">
                {charge?.title}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => {
                    setMessage(
                      charge?.is_refundable ? t("refundable_message") : t("non_refundable_message")
                    );
                    setActiveTooltip(index);
                  }}
                >
                  <CgInfo />
                </button>
                {activeTooltip === index && (
                  <ChargesInfoPopup message={message} onClose={() => setActiveTooltip(null)} />
                )}
              </span>
              <span>{amount(charge?.amount)}</span>
            </div>
          ))}

          {!hasError && orderType === "doorstep" && (
            <div className="flex items-center justify-between py-1 text-[13px] text-[var(--foreground-secondary)]">
              <span className="relative flex items-center">
                {t("delivery_charge")}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => {
                    setMessage(
                      <div className="flex flex-col gap-2">
                        <span className="font-semibold">{t("delivery_charge_details")}</span>
                        {checkoutData?.delivery_charge?.sellers_info?.map((seller, i) => (
                          <div key={i} className="flex items-center justify-between gap-4 text-xs">
                            <span>{seller.seller_name}</span>
                            <span className="whitespace-nowrap font-medium">
                              {amount(seller.delivery_charge)}
                            </span>
                          </div>
                        ))}
                        <span className="mt-1 text-xs">
                          {checkoutData?.delivery_charge?.is_delivery_charges_refundable == 1
                            ? t("refundable_message")
                            : t("non_refundable_message")}
                        </span>
                      </div>
                    );
                    setActiveTooltip("delivery");
                  }}
                >
                  <CgInfo />
                </button>
                {activeTooltip === "delivery" && (
                  <ChargesInfoPopup message={message} onClose={() => setActiveTooltip(null)} />
                )}
              </span>
              {/* A free slot (or a free-delivery coupon) zeroes this server-side. */}
              <span>{deliveryCharge === 0 ? t("freedelivery") : amount(deliveryCharge)}</span>
            </div>
          )}

          {checkoutData?.promocode_details && !hasError && (
            <div className="flex items-center justify-between py-1 text-[13px] text-[var(--status-success-foreground)]">
              <span>{t("promoDiscount")}</span>
              <span>− {amount(checkoutData?.promocode_details?.discount)}</span>
            </div>
          )}

          {walletUsed > 0 && (
            <div className="flex items-center justify-between py-1 text-[13px] text-[var(--status-success-foreground)]">
              <span>{t("wallet_balance_used")}</span>
              <span>− {amount(walletUsed)}</span>
            </div>
          )}

          <div className="mt-1.5 flex items-center justify-between border-t border-[var(--border-default)] pt-2.5 text-[14.5px] font-extrabold text-[var(--foreground-primary)]">
            <span>{t("total")}</span>
            <span>{amount(hasError ? fallbackSubTotal : payable)}</span>
          </div>

          {credit && !hasError && (
            <>
              <div className="flex items-center justify-between pt-2 text-[13px] text-[var(--foreground-secondary)]">
                <span>{t("credit_installment_fee")}</span>
                <span>{amount(credit.fee)}</span>
              </div>
              <div className="flex items-center justify-between py-1 text-[13px] font-bold text-[var(--foreground-primary)]">
                <span>{t("credit_total_payable_on_credit")}</span>
                <span>{amount(credit.totalPayable)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BillDetailsCard;
