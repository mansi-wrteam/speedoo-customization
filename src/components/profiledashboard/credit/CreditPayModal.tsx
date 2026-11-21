import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import { deductUserBalance } from "@/redux/slices/userSlice";
import { installmentRemaining } from "@/utils/credit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WalletBalanceModal from "@/components/profiledashboard/wallet/WalletBalanceModal";
import RedeemCouponModal from "@/components/profiledashboard/coupon/RedeemCouponModal";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Installment } from "@/types/models";
import { useMoney } from "./useMoney";

export interface CreditPayModalProps {
  installment: Installment | null;
  onClose: () => void;
  onPaid: () => void;
}

const CreditPayModal = ({ installment, onClose, onPaid }: CreditPayModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const money = useMoney();
  const balance = Number(useSelector((state: RootState) => state.User.user?.balance) ?? 0);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [recharge, setRecharge] = useState(false);
  const [redeem, setRedeem] = useState(false);

  const remaining = installment ? installmentRemaining(installment.amount, installment.paid_amount) : 0;

  useEffect(() => {
    setAmount(installment ? String(remaining) : "");
  }, [installment, remaining]);

  const value = Number(amount);
  const invalid = !(value > 0) || value > remaining;
  const insufficient = value > balance;

  const handlePay = async () => {
    if (!installment || invalid) {
      toast.error(t("credit_invalid_amount"));
      return;
    }
    setPaying(true);
    try {
      const response = await api.payInstallmentWithWallet({
        installmentId: installment.id,
        amount: value < remaining ? value : undefined,
      });
      if (response.status == 1) {
        toast.success(response.message);
        dispatch(deductUserBalance({ data: Number(response.data.payment.amount) }));
        onPaid();
        onClose();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log("Error", error);
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <Dialog open={!!installment} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          aria-describedby="creditPayModal"
          className="w-full max-w-[480px] gap-0 overflow-hidden rounded-2xl border-0 bg-[var(--background-subtle)] p-0"
        >
          <DialogHeader className="space-y-0 border-b border-[var(--border-subtle)] p-4">
            <DialogTitle>{t("credit_pay_installment")}</DialogTitle>
          </DialogHeader>
          {installment && (
            <div className="flex flex-col gap-3 p-4">
              <div className="text-sm text-[var(--foreground-secondary)]">
                {t("order")} #{installment.order_id} · {t("credit_installment")} {installment.installment_no}
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("credit_remaining")}</span>
                <b>{money(remaining)}</b>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("walletBalance")}</span>
                <b>{money(balance)}</b>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">{t("credit_amount_to_pay")}</span>
                <input
                  type="number"
                  min={0}
                  max={remaining}
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-transparent p-2"
                />
              </label>
              {insufficient && !invalid && (
                <div className="flex flex-col items-start gap-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <span>{t("insufficient_wallet_balance")}</span>
                  <span className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => setRecharge(true)} className="underline">
                      {t("addWalletBalance")}
                    </button>
                    <button type="button" onClick={() => setRedeem(true)} className="underline">
                      {t("coupon_redeem_title")}
                    </button>
                  </span>
                </div>
              )}
              <p className="text-xs text-[var(--foreground-secondary)]">{t("credit_cash_info")}</p>
              <button
                type="button"
                disabled={paying || invalid || insufficient}
                onClick={handlePay}
                className="rounded-lg bg-[var(--brand-foreground-default)] px-6 py-2 text-white disabled:opacity-50"
              >
                {paying ? t("loading") : t("credit_pay_with_wallet")}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <WalletBalanceModal addWalletModal={recharge} setAddWalletModal={setRecharge} />
      <RedeemCouponModal open={redeem} onOpenChange={setRedeem} />
    </>
  );
};

export default CreditPayModal;
