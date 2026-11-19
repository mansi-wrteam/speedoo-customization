import React, { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/router";
import * as api from "@/api/apiRoutes";
import { t } from "@/utils/translation";
import { toast } from "react-toastify";
import { formatCustomDate } from "@/lib/utils";
import OrderAdressCard from "./OrderAdressCard";
import { useSelector } from "react-redux";
import OrderItems from "./OrderItems";
import OrderPrescriptions from "./OrderPrescriptions";
import OrderStepper from "./OrderStatusStepper";
import FinalCheckoutSummary from "./FinalCheckoutSummary";
import OrderEtaRow from "./OrderEtaRow";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import { MdOutlineFileDownload, MdOutlineWatchLater } from "react-icons/md";
import Loader from "../loader/Loader";
import { FiPhoneCall } from "react-icons/fi";
import { IoLocationOutline } from "react-icons/io5";
import { useRedirectHomeOnModuleChange } from "@/utils/useRedirectHomeOnModuleChange";
import { useOrderEta } from "@/utils/useOrderEta";
import type { AxiosError } from "axios";
import type { Numeric } from "@/types/common";
import type { Order } from "@/types/models";
import type { RootState } from "@/types/state";

const OrderDetail = () => {
  const router = useRouter();
  const { orderid } = router.query;
  // An order belongs to the module it was placed under — switching module
  // means this order isn't part of the new module's context, so go home.
  useRedirectHomeOnModuleChange();
  const address = useSelector((state: RootState) => state.Addresses);
  // Starts as [] (fields read as undefined) until the order loads.
  const [orderDetail, setOrderDetail] = useState<Order>([] as unknown as Order);
  const [deliveryAddress, setDeliveryAddress] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderid) {
      handleFetchOrderDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderid]);

  /**
   * `silent` re-reads without the spinner: the 60 s poll and the focus refetch
   * must not blank a summary the customer is reading (§2.5).
   */
  const handleFetchOrderDetail = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const response = await api.getOrders({ orderId: orderid as string });
        if (response?.status == 1) {
          setOrderDetail(response.data[0]);
        } else {
          console.log("Error", response);
        }
      } catch (error) {
        console.log("Error", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [orderid]
  );

  const reloadOrder = useCallback(() => handleFetchOrderDetail(true), [handleFetchOrderDetail]);
  const { eta } = useOrderEta({ order: orderDetail, reload: reloadOrder });

  const handleDownloadInvoice = async () => {
    try {
      const response = await api.downloadInvoice({ orderId: orderid as string });
      var fileURL = window.URL.createObjectURL(new Blob([response.data]));
      var fileLink = document.createElement("a");
      fileLink.href = fileURL;
      fileLink.setAttribute("download", "Invoice-No:" + orderid + ".pdf");
      document.body.appendChild(fileLink);
      fileLink.click();
    } catch (error) {
      if ((error as AxiosError).request?.statusText) {
        toast.error((error as AxiosError).request.statusText);
      } else if ((error as AxiosError).message) {
        toast.error((error as AxiosError).message);
      } else {
        toast.error(t("something_went_wrong"));
      }
    }
  };

  const handleLocationRedirect = (lat: Numeric | undefined, lng: Numeric | undefined) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  return (
    <section>
      <BreadCrumb />
      <div className="container my-12 px-2">
        {loading ? (
          <>
            <Loader />
          </>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-[var(--surface-subtle)] p-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col justify-center gap-1">
                  <span className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                    {t("orderNumber")}:
                  </span>
                  <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">#{orderDetail?.id}</h1>
                </div>
                <div className="w-px self-stretch rounded-[32px] bg-[var(--border-default)]"></div>
                <div className="flex flex-col justify-center gap-1">
                  <span className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                    {t("order_type")}:
                  </span>
                  <p className="text-base font-medium leading-6 text-[var(--foreground-primary)]">
                    {orderDetail?.order_type == "doorstep"
                      ? t("home_delivery")
                      : t("store_pickup")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-start md:flex-row md:items-center md:gap-4">
                <div className="flex flex-col justify-center gap-1 md:items-end">
                  <span className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)] md:text-right">{t("orderDate")}</span>
                  <p className="text-base font-medium leading-6 text-[var(--foreground-primary)] md:text-right">
                    {orderDetail?.date}
                  </p>
                </div>
                {/* Fixed-window orders say when; quick ones say how long (§2.2). */}
                {orderDetail?.estimate_date ? (
                  <div className="flex flex-col justify-center gap-1 md:items-end">
                    <span className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)] md:text-right">
                      {t("estimage_delivery_date")}
                    </span>
                    <p className="text-base font-medium leading-6 text-[var(--foreground-primary)] md:text-right">
                      {orderDetail.estimate_date}
                    </p>
                  </div>
                ) : null}
                <OrderEtaRow eta={eta} />
                {Number(
                  (orderDetail?.active_status as number) < 6 &&
                  parseInt(orderDetail?.otp as string) !== 0 &&
                  orderDetail.order_type == "doorstep" &&
                  orderDetail?.otp !== null
                ) ? (
                  <div className="flex flex-col justify-center gap-1 md:items-end">
                    <span className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)] md:text-right">{t("otp")}</span>
                    <p className="text-base font-medium leading-6 text-[var(--foreground-primary)] md:text-right">{orderDetail?.otp}</p>
                  </div>
                ) : (
                  <></>
                )}

                {/* {Number(orderDetail?.active_status) === 6 ? ( */}
                <div className="flex items-center gap-4 md:self-stretch">
                  <div className="hidden w-px self-stretch rounded-[32px] bg-[var(--border-default)] md:block"></div>
                  <button
                    className="flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]"
                    onClick={handleDownloadInvoice}
                  >
                    <MdOutlineFileDownload size={16} /> {t("GetInvoice")}
                  </button>
                </div>
                {/* ) : null} */}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 px-2 md:px-0 md:gap-8">
              {orderDetail?.order_note !== "" && (
                <div className="col-span-12 flex flex-col gap-3 mb-8 md:mb-2">
                  <h3 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
                    {t("order_note_title")}
                  </h3>
                  <div className="rounded-2xl p-4 text-base font-normal leading-6 text-[var(--foreground-secondary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                    <p>{orderDetail?.order_note}</p>
                  </div>
                </div>
              )}

              <div className="col-span-12 md:col-span-8 flex flex-col gap-8">
                {orderDetail?.order_type == "doorstep" ? (
                  <div className="flex flex-col gap-3">
                    <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
                      {t("shippingAdress")}
                    </h1>
                    <div className="rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                      <OrderAdressCard orderDetail={orderDetail} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
                      {t("pickup_from_store")}
                    </h1>
                    <div className="flex h-full flex-col gap-6 rounded-2xl p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 items-center">
                          <IoLocationOutline size={22} className="text-[var(--foreground-tertiary)]" />
                          <div className="flex flex-col gap-1">
                            <h2 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                              {orderDetail?.pickup_address?.seller_name}
                            </h2>
                            <p className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">
                              {
                                orderDetail?.pickup_address
                                  ?.pickup_store_address
                              }
                            </p>
                          </div>
                        </div>
                        <div>
                          <button
                            className="flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                            onClick={() => {
                              handleLocationRedirect(
                                orderDetail?.pickup_address?.pickup_latitude,
                                orderDetail?.pickup_address?.pickup_longitude
                              );
                            }}
                          >
                            <IoLocationOutline size={22} />
                            {t("direction")}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex gap-2 items-center">
                          <FiPhoneCall size={20} className="text-[var(--foreground-tertiary)]" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <h2 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{t("phone")}</h2>
                          <p className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">
                            {orderDetail?.pickup_address?.seller_mobile}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex gap-2 items-center">
                          <MdOutlineWatchLater size={20} className="text-[var(--foreground-tertiary)]" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <h2 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                            {t("open_hours")}
                          </h2>
                          <p className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">
                            {`${t("today")} ${orderDetail?.pickup_address?.opening_time
                              } - ${orderDetail?.pickup_address?.closing_time}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">{t("items")}</h1>
                  <OrderItems
                    products={orderDetail?.items}
                    handleFetchOrderDetail={handleFetchOrderDetail}
                    isShowProductRating={orderDetail?.product_rating == true}
                  />
                </div>

                <OrderPrescriptions orderDetail={orderDetail} />
              </div>

              <div className="col-span-12 md:col-span-4 flex flex-col gap-6 mt-4 md:mt-0">
                {(orderDetail?.status?.length as number) > 0 && (
                  <div className="flex flex-col gap-3">
                    <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">{t("track_order")}</h1>
                    <OrderStepper orderDetail={orderDetail} />
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">{t("billing_details")}</h1>
                  <FinalCheckoutSummary orderDetail={orderDetail} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default OrderDetail;
