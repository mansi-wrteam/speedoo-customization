import { t } from "@/utils/translation";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import CancelReasonModal from "./CancelReasonModal";
import ReturnReasonModal from "./ReturnReasonModal";
import { MdOutlineStar } from "react-icons/md";
import ProductRatingModal from "./ProductRatingModal";
import { IoMdStar } from "react-icons/io";
import RatingUpdateModal from "./RatingUpdateModal";
import { getAddonName, getCartLineUnitPrice } from "@/utils/addonUtils";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import type { Id, Nullable } from "@/types/common";
import type { AppSettings, OrderItem } from "@/types/models";
import type { RootState } from "@/types/state";

interface ReturnState {
  /** Translation key. */
  label: string;
  /** CSS colour for the label. */
  tone: string;
  /** Order-item field holding the seller/rider note shown under the label. */
  noteField?: "cancellation_reason" | "return_remarks";
}

// `return_requested` codes mapped to their translation key and status tone.
// Shared by the desktop table and the mobile card so both stay in sync.
const RETURN_STATES: Record<number, ReturnState> = {
  1: { label: "return_requested", tone: "var(--status-warning-foreground)" },
  4: { label: "delivery_boy_assinged", tone: "var(--status-information-foreground)" },
  5: { label: "deliver_boy_out_for_pickup", tone: "var(--status-information-foreground)" },
  6: { label: "item_received_from_customer", tone: "var(--foreground-tertiary)" },
  7: {
    label: "return_request_cancel_by_delivery_boy",
    tone: "var(--status-error-foreground)",
    noteField: "cancellation_reason",
  },
  8: { label: "item_returned_to_seller", tone: "var(--foreground-primary)" },
  3: {
    label: "return_rejected",
    tone: "var(--status-error-foreground)",
    noteField: "return_remarks",
  },
};

interface ItemStatusNoteProps {
  product: OrderItem;
  setting: Nullable<AppSettings>;
}

const ItemStatusNote = ({ product, setting }: ItemStatusNoteProps) => {
  const state = RETURN_STATES[Number(product?.return_requested)];

  return (
    <>
      {state && (
        <>
          <p
            className="text-sm font-medium leading-5"
            style={{ color: state.tone }}
          >
            {t(state.label)}
          </p>
          {state.noteField && (
            <p className="text-xs text-[var(--foreground-tertiary)]">{`${t("sellerNote")}: ${product?.[state.noteField]}`}</p>
          )}
        </>
      )}
      {Number(product?.active_status) === 8 && (
        <span className="text-sm font-medium leading-5 text-[var(--status-error-foreground)]">{`${t("total")} ${setting?.currency}${product?.refund_amount} ${t("refunded")}`}</span>
      )}
    </>
  );
};

export interface OrderItemsProps {
  /** `orderDetail?.items` — undefined until the order loads. */
  products: OrderItem[] | undefined;
  /** Reloads the order after a cancel, return or rating. */
  handleFetchOrderDetail: () => Promise<void>;
  isShowProductRating: boolean;
}

const OrderItems = ({
  products,
  handleFetchOrderDetail,
  isShowProductRating,
}: OrderItemsProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const user = useSelector((state: RootState) => state.User.user);

  // Starts as [] until an item's action button is clicked.
  const [selectedProduct, setSelectedProduct] = useState<OrderItem>([] as unknown as OrderItem);
  const [showCancelMoodal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showUpdateRating, setShowUpdateRating] = useState(false);
  const [ratingId, setRatingId] = useState<Nullable<Id> | undefined>(null);

  const handleCancel = (product: OrderItem) => {
    setSelectedProduct(product);
    setShowCancelModal(true);
  };

  const handleReturn = (product: OrderItem) => {
    setSelectedProduct(product);
    setShowReturnModal(true);
  };

  const handleShowRating = (product: OrderItem) => {
    setSelectedProduct(product);
    setShowRating(true);
  };

  const handleShowUpdateRating = (product: OrderItem) => {
    const rating = product?.item_rating?.find(
      (rating) => rating?.user_id == user?.id,
    );
    const ratingId = rating?.id;
    setRatingId(ratingId);
    setShowUpdateRating(true);
  };

  const showAction = products?.some((product) => {
    const canCancel =
      Number(product?.active_status) <= 6 &&
      Number(product?.active_status) <= Number(product?.till_status) &&
      Number(product?.cancelable_status) === 1;

    const canReturn =
      Number(product?.active_status) === 6 &&
      Number(product?.return_status) === 1 &&
      product?.return_requested === null;

    return canCancel || canReturn;
  });

  // Returns true when a product is cancelled (active_status=7).
  // Used to show the Action column header even when no cancel/return action is available.
  // cancelable_status isn't checked here — it can still read 1 on a cancelled
  // item (it only governs whether the Cancel button is offered while active_status
  // is <= 6), so requiring it too made an already-cancelled item's status vanish.
  const showStatus = products?.some(
    (product) => Number(product?.active_status) === 7
  );

  // Shared button styles, so the desktop table and mobile card can't drift apart.
  const reviewChipClass =
    "flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-medium leading-5 bg-[var(--status-warning-background)] text-[var(--foreground-primary)] transition-colors hover:bg-[var(--status-warning-border)]";
  const rateButtonClass =
    "flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]";
  const cancelButtonClass =
    "rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-destructive-background-default)] text-[var(--button-destructive-foreground-default)] transition-colors hover:bg-[var(--button-destructive-background-hover)]";
  const returnLinkClass =
    "rounded-lg px-4 py-2 text-base font-medium leading-6 text-[var(--status-error-foreground)] underline";
  const cancelledPillClass =
    "rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--status-error-background)] text-[var(--status-error-foreground)] outline outline-1 -outline-offset-1 outline-[var(--status-error-border)]";

  return (
    <div className="overflow-auto rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="hidden lg:flex">
        <table className="table-auto w-full min-w-[600px]">
          <thead className="bg-[var(--surface-subtle)]">
            <tr>
              <th className="border-b border-[var(--border-subtle)] p-4 text-left text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                {t("product")}
              </th>
              <th className="border-b border-[var(--border-subtle)] p-4 text-left text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                {t("price")}
              </th>
              {(showAction || showStatus) && (
                <th className="border-b border-[var(--border-subtle)] p-4 text-left text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                  {showAction ? t("action") : t("status")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {products?.map((product) => {
              const userRating = product?.item_rating?.find(
                (rating) => rating?.user?.id === user?.id,
              );
              return (
                <tr
                  key={product?.id}
                  className="border-b border-[var(--border-subtle)] last:border-b-0"
                >
                  <td className="p-4 flex items-start gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-lg p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                      <ImageWithPlaceholder
                        src={product?.image_url}
                        alt="Products"
                        width={64}
                        height={64}
                        className="h-full w-full rounded-sm object-cover"
                      />
                    </div>

                    <div className="flex max-w-full flex-col gap-2 overflow-hidden">
                      <h2 className="truncate text-base font-normal leading-6 text-[var(--foreground-primary)]">
                        {product?.name}
                      </h2>
                      <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">{`${product?.variant_name} x ${product?.quantity}`}</p>
                      {(product?.selected_addons?.length as number) > 0 ? (
                        <p className="text-xs font-normal leading-4 text-[var(--foreground-tertiary)]">
                          {product.selected_addons!.map(getAddonName).filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                      <ItemStatusNote product={product} setting={setting} />
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                      {setting?.currency}
                      {getCartLineUnitPrice(product)?.toFixed(
                        setting?.decimal_point ? (setting?.decimal_point as number) : 0,
                      )}
                    </p>
                  </td>
                  {(showAction || showStatus) && (
                    <td className="p-4 align-top">
                      <div className="flex gap-2 flex-col items-stretch">
                        {Number(product?.active_status) === 6 &&
                          isShowProductRating &&
                          product?.return_requested === null ? (
                          userRating ? (
                            <button
                              className={reviewChipClass}
                              onClick={() => handleShowUpdateRating(product)}
                            >
                              {t("edit_review")}
                              <span className="opacity-75 text-[var(--border-inverse)]">
                                |
                              </span>
                              <span className="flex items-center gap-0.5">
                                {userRating?.rate}
                                <IoMdStar
                                  size={16}
                                  className="text-[var(--status-warning-foreground)]"
                                />
                              </span>
                            </button>
                          ) : (
                            <button
                              className={rateButtonClass}
                              onClick={() => handleShowRating(product)}
                            >
                              <MdOutlineStar size={20} />
                              {t("rate")}
                            </button>
                          )
                        ) : (
                          <></>
                        )}

                        {Number(product?.active_status) <= 6 &&
                          Number(product?.active_status) <=
                          Number(product?.till_status) &&
                          Number(product?.cancelable_status) === 1 && (
                            <button
                              className={cancelButtonClass}
                              onClick={() => handleCancel(product)}
                            >
                              {t("cancel")}
                            </button>
                          )}

                        {Number(product?.active_status) === 6 &&
                          Number(product?.return_status) === 1 &&
                          product?.return_requested === null && (
                            <button
                              className={returnLinkClass}
                              onClick={() => handleReturn(product)}
                            >
                              {t("return")}
                            </button>
                          )}

                        {Number(product?.active_status) === 7 && (
                            <div className="flex flex-col gap-1">
                              <button className={cancelledPillClass} disabled>
                                {t("cancelled")}
                              </button>
                              {product?.cancellation_reason && (
                                <p className="text-sm text-[var(--status-error-foreground)]">
                                  <span className="text-sm font-bold">{`${t("cancel_reason")} `}</span>
                                  {`${product.cancellation_reason}`}
                                </p>
                              )}
                            </div>
                          )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col lg:hidden">
        {products?.map((product) => {
          const userRating = product?.item_rating?.find(
            (rating) => rating?.user?.id === user?.id,
          );
          return (
            <div
              key={product?.id}
              className="flex w-full flex-col gap-4 border-b border-[var(--border-subtle)] p-4 last:border-b-0"
            >
              <div className="flex gap-3">
                <div className="relative h-16 w-16 flex-shrink-0 rounded-lg p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                  <ImageWithPlaceholder
                    src={product?.image_url}
                    alt="Products"
                    width={64}
                    height={64}
                    className="h-full w-full rounded-sm object-cover"
                  />
                </div>
                <div className="flex max-w-full flex-col gap-2 overflow-hidden">
                  <h2 className="truncate text-base font-normal leading-6 text-[var(--foreground-primary)]">
                    {product?.name}
                  </h2>
                  <p className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">{`${product?.variant_name} x ${product?.quantity}`}</p>
                  {(product?.selected_addons?.length as number) > 0 ? (
                    <p className="text-xs font-normal leading-4 text-[var(--foreground-tertiary)]">
                      {product.selected_addons!.map(getAddonName).filter(Boolean).join(", ")}
                    </p>
                  ) : null}
                  <ItemStatusNote product={product} setting={setting} />
                </div>
              </div>
              <div className="h-0 w-full border-b border-[var(--border-subtle)]"></div>
              <div className="flex justify-between">
                <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                  {t("price")}:
                </p>
                <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                  {setting?.currency}
                  {getCartLineUnitPrice(product)?.toFixed(
                    setting?.decimal_point ? (setting?.decimal_point as number) : 0,
                  )}
                </p>
              </div>
              {(showAction || showStatus) && (
                <>
                  <div className="h-0 w-full border-b border-[var(--border-subtle)]"></div>
                  <div className="flex flex-wrap items-center gap-2">
                    {Number(product?.active_status) === 6 &&
                      isShowProductRating &&
                      product?.return_requested === null ? (
                      userRating ? (
                        <button
                          className={reviewChipClass}
                          onClick={() => handleShowUpdateRating(product)}
                        >
                          {t("edit_review")}
                          <span className="opacity-75 text-[var(--border-inverse)]">
                            |
                          </span>
                          <span className="flex items-center gap-0.5">
                            {userRating?.rate}
                            <IoMdStar
                              size={16}
                              className="text-[var(--status-warning-foreground)]"
                            />
                          </span>
                        </button>
                      ) : (
                        <button
                          className={rateButtonClass}
                          onClick={() => handleShowRating(product)}
                        >
                          <MdOutlineStar size={20} />
                          {t("rate")}
                        </button>
                      )
                    ) : (
                      <></>
                    )}

                    {Number(product?.active_status) <= 6 &&
                      Number(product?.active_status) <=
                      Number(product?.till_status) &&
                      Number(product?.cancelable_status) === 1 && (
                        <button
                          className={cancelButtonClass}
                          onClick={() => handleCancel(product)}
                        >
                          {t("cancel")}
                        </button>
                      )}

                    {Number(product?.active_status) === 6 &&
                      Number(product?.return_status) === 1 &&
                      product?.return_requested === null && (
                        <button
                          className={returnLinkClass}
                          onClick={() => handleReturn(product)}
                        >
                          {t("return")}
                        </button>
                      )}

                    {Number(product?.active_status) === 7 && (
                        <div className="flex w-full flex-col gap-1">
                          <button className={cancelledPillClass} disabled>
                            {t("cancelled")}
                          </button>
                          {product?.cancellation_reason && (
                            <p className="text-sm text-[var(--status-error-foreground)]">
                              <span className="font-bold">{`${t("cancel_reason")}: `}</span>
                              {`${product.cancellation_reason}`}
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <CancelReasonModal
        showCancelMoodal={showCancelMoodal}
        setShowCancelModal={setShowCancelModal}
        selectedProduct={selectedProduct}
        handleFetchOrderDetail={handleFetchOrderDetail}
      />
      <ReturnReasonModal
        showReturnModal={showReturnModal}
        setShowReturnModal={setShowReturnModal}
        selectedProduct={selectedProduct}
        handleFetchOrderDetail={handleFetchOrderDetail}
      />
      <ProductRatingModal
        showRating={showRating}
        setShowRating={setShowRating}
        selectedProduct={selectedProduct}
        handleFetchOrderDetail={handleFetchOrderDetail}
      />
      <RatingUpdateModal
        ratingId={ratingId}
        showUpdateRating={showUpdateRating}
        setShowUpdateRating={setShowUpdateRating}
        handleFetchOrderDetail={handleFetchOrderDetail}
      />
    </div>
  );
};

export default OrderItems;
