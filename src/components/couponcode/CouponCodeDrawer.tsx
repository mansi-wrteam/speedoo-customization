import React, { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import * as api from "@/api/apiRoutes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RiCloseFill } from "react-icons/ri";
import { t } from "@/utils/translation";
import CouponCodeCard from "./CouponCodeCard";
import { useSelector } from "react-redux";
import NoCouponFound from "@/assets/not_found_images/No_Coupon_Code_Found.svg";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import type { RootState } from "@/types/state";

export interface CouponCodeDrawerProps {
  showCouponCode: boolean;
  setShowCouponCode: React.Dispatch<React.SetStateAction<boolean>>;
}

// Settles to `value` once it has stopped changing for `delay` ms.
const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
};

const CouponCodeDrawer = ({ showCouponCode, setShowCouponCode }: CouponCodeDrawerProps) => {
  const cart = useSelector((state: RootState) => state.Cart);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);

  const subTotal = Number(cart?.cartSubTotal ?? 0);
  // Coalesce a burst of +/- taps into one request — a held "+" fires once, not
  // once per tap.
  const settledSubTotal = useDebouncedValue(subTotal, 500);

  // `is_applicable` is computed server-side against the `amount` we ask with, so
  // a cached list describes the subtotal it was fetched for. Keying the cache on
  // the subtotal makes the refresh automatic: a new total is a new cache entry.
  // Identical keys also dedupe in flight, so a repeat of the same amount can't
  // fire twice.
  const { data: couponCodes } = useQuery({
    queryKey: ["promo_code", settledSubTotal],
    queryFn: async () => {
      const response = await api.getPromo({ amount: settledSubTotal });
      return response?.data ?? [];
    },
    // Never ask for offers on an empty cart, or while the drawer is closed.
    enabled: showCouponCode && settledSubTotal > 0,
    // Keep the old list on screen while the new one loads, instead of
    // collapsing the sheet and reflowing it.
    placeholderData: keepPreviousData,
  });

  const handleHideCouponCode = () => {
    setShowCouponCode(false);
  };
  return (
    <Sheet open={showCouponCode} modal={false}>
      <SheetContent
        className="p-0 w-full sm:w-[900px] overflow-y-auto"
        side={language?.type == "RTL" ? "left" : "right"}
      >
        <SheetHeader className="p-0 border-b border-[var(--border-default)] flex justify-between text-left">
          <SheetTitle className="p-4 flex flex-row items-center justify-between">
            <p className="text-xl font-semibold text-[var(--foreground-primary)]">{t("coupons")}</p>
            <div className="rounded-lg p-3 gap-1 cursor-pointer">
              <RiCloseFill
                size={22}
                className="text-[var(--button-link-foreground-default)]"
                onClick={() => handleHideCouponCode()}
              />
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="p-4 flex flex-col gap-4">
          {(couponCodes?.length as number) > 0 ? (
            couponCodes?.map((coupon) => {
              return (
                <div key={coupon?.id}>
                  {" "}
                  <CouponCodeCard
                    coupon={coupon}
                    setShowCouponCode={setShowCouponCode}
                  />
                </div>
              );
            })
          ) : (
            <div className="flex justify-center items-center h-[80vh] flex-col">
              <ImageWithPlaceholder
                src={NoCouponFound}
                alt={"Image not found"}
                className="h-64 w-64"
                width={400}
                height={400}
              />
              <p className="text-xl text-center  font-bold">
                {t("no_coupon_code_available")}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CouponCodeDrawer;
