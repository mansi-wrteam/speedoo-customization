import { t } from "@/utils/translation";
import React, { useState } from "react";

import { useSelector } from "react-redux";
import { CgInfo } from "react-icons/cg";
import ChargesInfoPopup from "../cart-checkout/ChargesInfoPopup";
import type { Order } from "@/types/models";
import type { RootState } from "@/types/state";

export interface FinalCheckoutSummaryProps {
  orderDetail: Order;
}

const FinalCheckoutSummary = ({ orderDetail }: FinalCheckoutSummaryProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  /** Index of the additional charge whose info popup is open, or "delivery". */
  const [activeTooltip, setActiveTooltip] = useState<number | "delivery" | null>(null);
  const [message, setMessage] = useState<React.ReactNode>("");
  return (
    <div className="rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="flex flex-col gap-4 px-4 pt-4 pb-2">
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">{t("payment_method")}</span>
          <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{orderDetail?.payment_method}</span>
        </div>
        <div className="flex flex-col gap-4">
          {orderDetail?.transaction_id != 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">{t("transaction_id")}</span>
              <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                {orderDetail?.transaction_id}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">{t("sub_total")}</span>
            <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
              {setting?.currency}
              {Number(orderDetail?.remaining_total)}
            </span>
          </div>

          {(orderDetail?.additional_charges?.length as number) > 0
            ? orderDetail?.additional_charges?.map((charge, index) => {
                return (
                  <div
                    className="flex justify-between items-center my-2"
                    key={index}
                  >
                    <span className="flex items-center relative text-sm font-medium leading-5 text-[var(--foreground-secondary)]">{charge?.title} 
                      <span className="ml-1 cursor-pointer text-[var(--foreground-tertiary)]" onClick={() => {
                        setMessage(charge?.is_refundable ? t("refundable_message") : t("non_refundable_message"));
                        setActiveTooltip(index);
                      }}>
                        <CgInfo />
                      </span>
                      {activeTooltip === index && (
                        <ChargesInfoPopup message={message} onClose={() => setActiveTooltip(null)} />
                      )}
                    </span>
                    <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                      {setting?.currency}
                      {charge?.amount}
                    </span>
                  </div>
                );
              })
            : null}
          {orderDetail?.order_type == "doorstep" && (
            <div className="flex justify-between items-center">
              <span className="flex items-center relative text-sm font-medium leading-5 text-[var(--foreground-secondary)]">
                {t("delivery_charge")}
                <span className="ml-1 cursor-pointer text-[var(--foreground-tertiary)]" onClick={() => {
                  setMessage(
                                <div className="flex flex-col gap-2">
                                  <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{t("delivery_charge_details")}</span>
                                  <span className={`text-xs mt-1`}>
                                    {orderDetail?.is_delivery_charges_refundable == 1 ? t("refundable_message") : t("non_refundable_message")}
                                  </span>
                                </div>
                              );
                  setActiveTooltip('delivery');
                }}>
                  <CgInfo />
                </span>
                {activeTooltip === 'delivery' && (
                  <ChargesInfoPopup message={message} onClose={() => setActiveTooltip(null)} />
                )}
              </span>
              <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                {setting?.currency}
                {orderDetail?.delivery_charge}
              </span>
            </div>
          )}

          {orderDetail?.promo_discount != 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">{t("promoDiscount")}</span>
              <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                - {setting?.currency}
                {orderDetail?.promo_discount?.toFixed(
                  setting?.decimal_point ? (setting?.decimal_point as number) : 0
                )}
              </span>
            </div>
          )}

          {orderDetail?.wallet_balance != 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">{t("walletBalance")}</span>
              <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                - {setting?.currency}
                {orderDetail?.wallet_balance?.toFixed(
                  setting?.decimal_point ? (setting?.decimal_point as number) : 0
                )}
              </span>
            </div>
          )}

          <div className="-mx-4 mt-2 border-t border-[var(--border-subtle)] px-4 pt-2 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-xl font-bold leading-7 text-[var(--foreground-primary)]">
                {t("total")} {t("amount")}
              </span>
              <span className="text-xl font-bold leading-7 text-[var(--foreground-primary)]">
                {setting?.currency}
                {Number(orderDetail?.remaining_final)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalCheckoutSummary;
