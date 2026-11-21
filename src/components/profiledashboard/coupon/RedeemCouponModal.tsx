import React, { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import { couponErrorKey, normalizeCouponCode } from "@/utils/coupon";
import { useRefreshUser } from "@/utils/useRefreshUser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMoney } from "@/components/profiledashboard/credit/useMoney";
import type { CouponRedeemData } from "@/types/models";

export interface RedeemCouponModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful redeem, once the wallet balance has been refreshed. */
  onRedeemed?: () => void;
}

const RedeemCouponModal = ({ open, onOpenChange, onRedeemed }: RedeemCouponModalProps) => {
  const money = useMoney();
  const refreshUser = useRefreshUser();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [result, setResult] = useState<CouponRedeemData | null>(null);

  useEffect(() => {
    if (!open) {
      setCode("");
      setErrorKey(null);
      setResult(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const normalized = normalizeCouponCode(code);
    if (!normalized) {
      setErrorKey("coupon_err_validation_error");
      return;
    }
    setSubmitting(true);
    setErrorKey(null);
    try {
      const response = await api.redeemCoupon({ code: normalized });
      if (response.status == 1) {
        setResult(response.data);
        await refreshUser();
        onRedeemed?.();
      } else {
        setErrorKey(couponErrorKey(response.code));
      }
    } catch (error) {
      console.log("Error", error);
      setErrorKey(isAxiosError(error) && error.response?.status === 429 ? "coupon_err_too_many" : "coupon_err_something_went_wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="redeemCouponModal"
        className="w-full max-w-[480px] gap-0 overflow-hidden rounded-2xl border-0 bg-[var(--background-subtle)] p-0"
      >
        <DialogHeader className="space-y-0 border-b border-[var(--border-subtle)] p-4">
          <DialogTitle>{t("coupon_redeem_title")}</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <h3 className="text-lg font-semibold text-[var(--foreground-primary)]">{t("coupon_redeemed_title")}</h3>
            <p className="text-2xl font-bold text-[var(--status-success-foreground)]">+{money(result.amount)}</p>
            <p className="text-sm text-[var(--foreground-secondary)]">
              {t("coupon_new_balance")}: <b>{money(result.new_balance)}</b>
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="mt-2 rounded-lg bg-[var(--brand-foreground-default)] px-6 py-2 text-white"
            >
              {t("coupon_done")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
            <p className="text-sm text-[var(--foreground-secondary)]">{t("coupon_redeem_desc")}</p>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setErrorKey(null);
              }}
              placeholder="SPD-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-label={t("coupon_code")}
              className="rounded-lg border border-[var(--border-subtle)] bg-transparent p-2 text-center text-lg tracking-widest"
            />
            {errorKey && <p className="text-sm text-[var(--status-error-default)]">{t(errorKey)}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--brand-foreground-default)] px-6 py-2 text-white disabled:opacity-50"
            >
              {submitting ? t("loading") : t("coupon_redeem_button")}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RedeemCouponModal;
