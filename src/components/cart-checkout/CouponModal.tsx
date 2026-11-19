import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RiCloseFill, RiCoupon3Line } from "react-icons/ri";
import * as api from "@/api/apiRoutes";
import Loader from "@/components/loader/Loader";
import { t } from "@/utils/translation";
import { formatAmount } from "@/lib/utils";
import { couponShortfall, isCouponApplicable } from "@/utils/promoUtils";
import type { AppliedPromoCode, PromoCode } from "@/types/models";
import type { RootState } from "@/types/state";

export interface CouponModalProps {
  open: boolean;
  onClose: () => void;
  /** Settled cart subtotal the offers are priced against. */
  subTotal: number;
  applied: AppliedPromoCode | null;
  /** Validates a code against the subtotal; returns the server's message on failure. */
  onApply: (code: string) => Promise<string | null>;
  onRemove: () => void;
}

/**
 * Coupons (WEB_PARITY_V4.0.2 §1.2): type a code, or pick from the offers the
 * server says apply to this subtotal.
 *
 * `is_applicable` is computed server-side against the `amount` we ask with, so
 * the query is keyed on the subtotal — a new total is a new cache entry, and
 * identical keys dedupe in flight.
 */
const CouponModal = ({
  open,
  onClose,
  subTotal,
  applied,
  onApply,
  onRemove,
}: CouponModalProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const currency = setting?.currency ?? "";
  const decimals = setting?.decimal_point;

  const { data: offers, isLoading } = useQuery({
    queryKey: ["promo_code", subTotal],
    queryFn: async () => {
      const response = await api.getPromo({ amount: subTotal });
      return response?.data ?? [];
    },
    enabled: open && subTotal > 0,
    placeholderData: keepPreviousData,
  });

  const apply = async (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return;
    setApplying(true);
    setError(null);
    const message = await onApply(trimmed);
    setApplying(false);
    if (message) {
      setError(message);
      return;
    }
    setCode("");
    onClose();
  };

  const offerNote = (offer: PromoCode) => {
    const shortfall = couponShortfall(offer, subTotal);
    if (shortfall != null) {
      return (
        <span className="text-[var(--foreground-tertiary)]">
          {`${t("add_items_worth")} ${currency}${formatAmount(shortfall, decimals)} ${t("more_to_use_this_coupon")}`}
        </span>
      );
    }
    if (!isCouponApplicable(offer)) {
      return <span className="text-[var(--foreground-tertiary)]">{t("coupon_not_applicable")}</span>;
    }
    // `discounted_amount` is the cart total AFTER the coupon, so the saving is
    // the difference — not the field itself.
    const saving = Math.max(subTotal - Number(offer?.discounted_amount ?? subTotal), 0);
    if (saving <= 0) return null;
    const isApplied = applied?.promo_code === offer?.promo_code;
    return (
      <span>
        {isApplied ? t("you_are_saving") : t("you_will_save")}{" "}
        <b className="font-extrabold text-[var(--status-success-foreground)]">
          {currency}
          {formatAmount(saving, decimals)}
        </b>
      </span>
    );
  };

  return (
    <Dialog open={open}>
      <DialogContent className="flex w-[440px] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
          <DialogTitle className="text-[19px] font-extrabold text-[var(--foreground-primary)]">
            {t("coupons")}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--foreground-secondary)]"
          >
            <RiCloseFill size={18} />
          </button>
        </div>

        <div className="max-h-[min(540px,70vh)] overflow-y-auto px-5 pb-5 pt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") apply(code);
              }}
              placeholder={t("enter_coupon_code")}
              className="flex-1 rounded-lg bg-[var(--form-default-background)] px-3.5 py-2.5 text-[13px] uppercase text-[var(--form-default-text)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] placeholder:normal-case placeholder:text-[var(--form-default-placeholder)] focus:outline-[var(--form-focus-filled-border)]"
            />
            <button
              type="button"
              onClick={() => apply(code)}
              disabled={applying || !code.trim()}
              className="rounded-lg bg-[var(--button-primary-background-default)] px-5 text-[13px] font-bold text-[var(--button-primary-foreground-default)] disabled:cursor-not-allowed disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-foreground-disabled)]"
            >
              {t("apply")}
            </button>
          </div>
          {error && (
            <p className="mt-1.5 text-[11.5px] text-[var(--status-error-default)]">{error}</p>
          )}

          <div className="my-4 flex items-center gap-2.5">
            <span className="h-px flex-1 bg-[var(--border-subtle)]" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--foreground-tertiary)]">
              {t("available_offers")}
            </span>
            <span className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {(offers || []).map((offer) => {
                const isApplied = applied?.promo_code === offer?.promo_code;
                const eligible = isCouponApplicable(offer) && couponShortfall(offer, subTotal) == null;
                return (
                  <div
                    key={offer?.id}
                    className={`rounded-xl p-4 outline outline-1 -outline-offset-1 transition-colors ${
                      isApplied
                        ? "bg-[var(--status-success-background)] outline-[var(--status-success-foreground)]"
                        : "bg-[var(--surface-default)] outline-[var(--border-subtle)]"
                    } ${eligible ? "" : "opacity-60"}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                          isApplied
                            ? "bg-[var(--status-success-foreground)] text-[var(--foreground-inverse)]"
                            : "bg-[var(--surface-subtle)] text-[var(--foreground-tertiary)]"
                        }`}
                      >
                        <RiCoupon3Line size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15.5px] font-extrabold tracking-wide text-[var(--foreground-primary)]">
                          {offer?.promo_code}
                        </p>
                        {offer?.translations?.message && (
                          <p className="truncate text-[12.5px] font-bold text-[var(--brand-foreground-default)]">
                            {offer.translations.message}
                          </p>
                        )}
                      </div>
                      {isApplied ? (
                        <button
                          type="button"
                          onClick={() => {
                            onRemove();
                            onClose();
                          }}
                          className="flex-shrink-0 rounded-full px-4 py-2 text-[12.5px] font-extrabold text-[var(--status-error-default)] outline outline-1 -outline-offset-1 outline-[var(--status-error-default)]"
                        >
                          {t("delete")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!eligible || applying}
                          onClick={() => apply(String(offer?.promo_code ?? ""))}
                          className="flex-shrink-0 rounded-full px-4 py-2 text-[12.5px] font-extrabold text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--foreground-primary)] disabled:cursor-not-allowed disabled:text-[var(--foreground-tertiary)] disabled:outline-[var(--border-default)]"
                        >
                          {t("apply")}
                        </button>
                      )}
                    </div>
                    {offerNote(offer) && (
                      <p className="mt-2.5 border-t border-dashed border-[var(--border-default)] pt-2.5 text-xs text-[var(--foreground-secondary)]">
                        {offerNote(offer)}
                      </p>
                    )}
                  </div>
                );
              })}
              {(offers || []).length === 0 && (
                <p className="py-6 text-center text-[13px] text-[var(--foreground-tertiary)]">
                  {t("no_coupons_found")}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CouponModal;
