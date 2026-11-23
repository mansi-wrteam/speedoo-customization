import React, { useState } from "react";
import { useSelector } from "react-redux";
import { t } from "@/utils/translation";
import type { RootState } from "@/types/state";
import WalletBalanceModal from "../wallet/WalletBalanceModal";
import RedeemCouponModal from "../coupon/RedeemCouponModal";
import { useMoney } from "../credit/useMoney";

const WalletCard = () => {
  const money = useMoney();
  const balance = useSelector((state: RootState) => state.User.user?.balance);
  const [addWalletModal, setAddWalletModal] = useState(false);
  const [redeemModal, setRedeemModal] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--brand-background-subtle)] bg-[var(--brand-background-subtle)] p-5">
      <div className="text-sm text-[var(--foreground-secondary)]">{t("walletBalance")}</div>
      <div className="text-3xl font-bold text-[var(--foreground-primary)]">{money(balance ?? 0)}</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAddWalletModal(true)}
          className="flex-1 rounded-lg bg-[var(--brand-foreground-default)] px-4 py-2 text-sm font-semibold text-white"
        >
          {t("addWalletBalance")}
        </button>
        <button
          type="button"
          onClick={() => setRedeemModal(true)}
          className="flex-1 rounded-lg border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground-primary)]"
        >
          {t("coupon_redeem_title")}
        </button>
      </div>
      <WalletBalanceModal addWalletModal={addWalletModal} setAddWalletModal={setAddWalletModal} />
      <RedeemCouponModal open={redeemModal} onOpenChange={setRedeemModal} />
    </div>
  );
};

export default WalletCard;
