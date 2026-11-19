import { t } from "@/utils/translation";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import * as api from "@/api/apiRoutes";
import { setCartPromo } from "@/redux/slices/cartSlice";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { formatAmount } from "@/lib/utils";
import { couponShortfall } from "@/utils/promoUtils";
import type { AppDispatch } from "@/redux/hooks";
import type { PromoCode } from "@/types/models";
import type { RootState } from "@/types/state";

export interface CouponCodeCardProps {
  coupon: PromoCode;
  setShowCouponCode: React.Dispatch<React.SetStateAction<boolean>>;
}

const CouponCodeCard = ({ coupon, setShowCouponCode }: CouponCodeCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const cart = useSelector((state: RootState) => state.Cart);
  const setting = useSelector((state: RootState) => state.Setting.setting);

  const isApplicable = coupon?.is_applicable == 1;
  // Only shown when the gap is provably positive — a coupon blocked for expiry
  // or a usage cap falls back to its own message instead.
  const shortfall = couponShortfall(coupon, cart?.cartSubTotal);

  const handleApplyCoupon = async () => {
    try {
      const response = await api.setPromoCode({
        promoCodeName: coupon?.promo_code,
        amount: cart?.cartSubTotal,
      });
      if (response.status == 1) {
        dispatch(setCartPromo({ data: response.data }));
        setShowCouponCode(false);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  return (
    <div className="w-full bg-[var(--surface-default)] rounded-lg border border-[var(--border-subtle)] flex flex-col">
      <div className="p-2 border-b border-[var(--border-subtle)] flex items-center gap-3">
        <div className="size-20 shrink-0 rounded-lg overflow-hidden relative">
          <ImageWithPlaceholder
            src={coupon?.image_url}
            alt="Promo image"
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
        <div className="flex-1 flex justify-between items-center gap-6">
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <h3 className="text-base font-medium text-[var(--foreground-primary)] line-clamp-1">
              {coupon?.promo_code}
            </h3>
            <p className="text-sm font-medium text-[var(--foreground-secondary)] line-clamp-2">
              {coupon?.translations?.message}
            </p>
          </div>
          <button
            disabled={!isApplicable}
            className="px-4 py-2 rounded-lg border border-[var(--button-outline-border-default)] text-base font-medium text-[var(--button-outline-foreground-default)] hover:bg-[var(--brand-background-default)] hover:text-[var(--foreground-inverse)] hover:border-transparent transition-colors disabled:text-[var(--foreground-disabled)] disabled:border-[var(--border-disabled)] disabled:bg-transparent"
            onClick={handleApplyCoupon}
          >
            {t("apply")}
          </button>
        </div>
      </div>
      {isApplicable ? (
        <p className="p-2 text-sm font-normal text-[var(--foreground-primary)]">{`${t("you_will_save")} ${setting?.currency ?? ""}${formatAmount(
          Number(cart?.cartSubTotal ?? 0) - Number(coupon?.discounted_amount ?? 0),
          setting?.decimal_point
        )}  ${t("on_this_coupon")}`}</p>
      ) : shortfall !== null ? (
        // The blocker, not another term — styled as a warning. Two lines, so the
        // amount is never the part that gets ellipsised.
        <p className="p-2 text-sm font-medium line-clamp-2 text-[var(--status-warning-foreground)]">
          {t("promo_code_shortfall")?.replace(
            "{amount}",
            `${setting?.currency ?? ""}${formatAmount(shortfall, setting?.decimal_point)}`
          )}
        </p>
      ) : null}
    </div>
  );
};

export default CouponCodeCard;
