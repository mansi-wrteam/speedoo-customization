import { t } from "@/utils/translation";
import { useSelector } from "react-redux";
import { FaArrowRight } from "react-icons/fa";
import { LocalizedLink } from "@/utils/localizedNav";
import ImageWithPlaceholder from "@/components/image-with-placeholder/ImageWithPlaceholder";
import ReoderConfirmModal from "./ReoderConfirmModal";
import CreditOrderBadge from "@/components/common/CreditOrderBadge";
import { useState } from "react";
import type { RootState } from "@/types/state";
import type { Order } from "@/types/models";

export interface PrevOrderCardProps {
  /** Always passed by PrevOrder; ProfileSidePanel (no importer) renders the card without it. */
  order?: Order;
}

const PrevOrderCard = ({ order }: PrevOrderCardProps) => {
  const setting = useSelector((state: RootState) => state.Setting);
  const orderFirstItem = order?.items![0];

  const [showReoderModal, setShowReorderModal] = useState(false);

  const handleReoder = () => {
    setShowReorderModal(true);
  };

  return (
    <div className="w-full">
      <div className="w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
        {/* Order meta */}
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] p-4 md:gap-6">
          <div className="flex gap-4 md:gap-6">
            <div className="flex flex-col justify-center gap-1">
              <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                {t("order")}
              </p>
              <p className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                {order?.id}
              </p>
              <CreditOrderBadge paymentMethod={order?.payment_method} />
            </div>
            <div className="flex flex-col justify-center gap-1">
              <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                {t("order_type")}
              </p>
              <p className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                {order?.order_type == "doorstep"
                  ? t("home_delivery")
                  : t("store_pickup")}
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-end justify-center gap-1">
            <p className="text-right text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
              {t("orderDate")}
            </p>
            <p className="text-right text-base font-medium leading-6 text-[var(--foreground-primary)]">
              {order?.date}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="flex flex-col items-start gap-4 p-4">
          <div className="flex w-full items-center gap-6">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-lg p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                <ImageWithPlaceholder
                  src={orderFirstItem?.image_url}
                  alt="demo image"
                  fill
                  className="h-full w-full rounded-lg p-1"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="line-clamp-2 text-base font-normal leading-6 text-[var(--foreground-primary)]">
                  {orderFirstItem?.name}
                </p>
                <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                  {orderFirstItem?.variant_name}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-1">
              {orderFirstItem?.discounted_price != 0 ? (
                <>
                  <p className="line-clamp-2 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                    {setting?.setting?.currency}
                    {orderFirstItem?.discounted_price}
                  </p>
                  <p className="text-sm font-normal leading-5 line-through text-[var(--foreground-tertiary)]">
                    {setting?.setting?.currency}
                    {orderFirstItem?.price}
                  </p>
                </>
              ) : (
                <p className="line-clamp-2 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                  {setting?.setting?.currency}
                  {orderFirstItem?.price}
                </p>
              )}
            </div>
          </div>

          {(order?.items?.length as number) > 1 && (
            <LocalizedLink
              href={`/order-detail/${order?.id}`}
              className="rounded-lg px-4 py-2 text-base font-medium leading-6 text-[var(--button-link-foreground-default)] transition-colors hover:text-[var(--button-link-foreground-hover)]"
            >
              {(order?.items?.length as number) - 1} {t("moteItems")}
            </LocalizedLink>
          )}
        </div>

        {/* Totals + actions */}
        <div className="flex flex-col justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 md:flex-row md:items-center md:gap-2">
          <div className="flex flex-1 flex-col justify-center gap-1">
            <span className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
              {`${t("total")} ${t("Credit")}`}
            </span>
            <span className="line-clamp-1 text-lg font-semibold leading-7 text-[var(--foreground-primary)]">
              {setting?.setting?.currency}
              {order?.final_total}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
              onClick={handleReoder}
            >
              {t("reorder")}
            </button>
            <LocalizedLink
              href={`/order-detail/${order?.id}`}
              className="flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
            >
              {t("view_details")} 
            </LocalizedLink>
          </div>
        </div>
      </div>
      <ReoderConfirmModal
        showReoderModal={showReoderModal}
        setShowReorderModal={setShowReorderModal}
        order={order}
      />
    </div>
  );
};

export default PrevOrderCard;
