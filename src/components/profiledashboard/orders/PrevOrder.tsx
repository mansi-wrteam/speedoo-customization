import React, { useEffect, useState } from "react";
import { t } from "@/utils/translation";
import PrevOrderCard from "./PrevOrderCard";
import * as api from "@/api/apiRoutes";
import Loader from "@/components/loader/Loader";
import CardSkeleton from "@/components/skeleton/CardSkeleton";
import OrderNotFoundImage from "@/assets/not_found_images/No_Orders.svg";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaCaretDown } from "react-icons/fa";
import { useSelector } from "react-redux";
import { useRedirectHomeOnModuleChange } from "@/utils/useRedirectHomeOnModuleChange";
import type { RootState } from "@/types/state";
import type { Order, OrderType } from "@/types/models";

const PrevOrder = () => {
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  // Orders belong to the module they were placed under — switching module
  // means this list no longer applies, so go home.
  useRedirectHomeOnModuleChange();
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [prevOrders, setPrevOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState<number | null | undefined>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [orderType, setOrderType] = useState<OrderType | "">("");

  useEffect(() => {
    handleFetchPrevOrders(false, 0);
  }, [orderType, activeModuleId]);

  const ordersPerPage = 5;

  const handleFetchPrevOrders = async (isLoadMore = false, newOffset: number) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await api.getOrders({
        limit: ordersPerPage,
        offset: newOffset,
        type: 0,
        orderType,
      });
      if (response?.status == 1) {
        if (isLoadMore) {
          setPrevOrders((ord) => [...ord, ...response?.data]);
        } else {
          setPrevOrders(response?.data);
        }
        setTotalOrders(response.total);
        setLoading(false);
        setLoadingMore(false);
      } else {
        setLoading(false);
        setPrevOrders([]);
        setLoadingMore(false);
      }
    } catch (error) {
      setLoading(false);
      setLoadingMore(false);
      console.log("Error", error);
    }
  };

  const handleFetchMore = async () => {
    const newOffset = offset + ordersPerPage;
    setOffset(newOffset);
    handleFetchPrevOrders(true, newOffset);
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="flex justify-between items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
        <h2 className="flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]">
          {t("order_history")}
        </h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="group flex w-full items-center justify-between gap-2 rounded-lg bg-[var(--form-default-background)] px-4 py-2 text-base text-[var(--form-default-text)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)]">
              <div className="font-medium">
                {orderType
                  ? orderType == "doorstep"
                    ? t("home_delivery")
                    : t("store_pickup")
                  : t("select_order_type")}
              </div>
              <div>
                <FaCaretDown className="text-[var(--form-default-icon)] transition-transform duration-300 ease-in-out group-data-[state=open]:-rotate-180" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-[var(--border-subtle)] bg-[var(--surface-default)] transition-all duration-300 ease-in-out">
              <DropdownMenuItem
                key={1}
                onSelect={() => setOrderType("")}
                className="text-base text-[var(--foreground-primary)]"
              >
                {t("default")}
              </DropdownMenuItem>
              <DropdownMenuItem
                key={1}
                onSelect={() => setOrderType("doorstep")}
                className="text-base text-[var(--foreground-primary)]"
              >
                {t("home_delivery")}
              </DropdownMenuItem>
              <DropdownMenuItem
                key={2}
                onSelect={() => setOrderType("selfpickup")}
                className="text-base text-[var(--foreground-primary)]"
              >
                {t("store_pickup")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-col gap-6 p-4">
        {loading ? (
          Array.from({ length: 6 })?.map((_, index) => {
            return <CardSkeleton height={200} padding="p-4" key={index} />;
          })
        ) : prevOrders?.length == 0 ? (
          <div className="h-full w-full flex items-center justify-center flex-col gap-2 p-3">
            <Image
              src={OrderNotFoundImage}
              alt="Order Not found"
              width={298}
              height={298}
              unoptimized
              className="h-1/2 w-1/2"
            />
            <h2 className="text-2xl font-bold text-[var(--foreground-primary)]">
              {t("no_order")}
            </h2>
          </div>
        ) : (
          prevOrders?.map((order) => {
            return <PrevOrderCard order={order} key={order?.id} />;
          })
        )}
        {loadingMore ? (
          Array?.from({ length: 6 })?.map((_, index) => {
            return <CardSkeleton height={200} padding="p-4" key={index} />;
          })
        ) : (
          <></>
        )}
      </div>
      {(totalOrders as number) > prevOrders?.length && (
        <div className="flex justify-center border-t border-[var(--border-subtle)] p-4">
          <button
            className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]"
            onClick={handleFetchMore}
          >
            {t("load_more")}
          </button>
        </div>
      )}
    </div>
  );
};

export default PrevOrder;
