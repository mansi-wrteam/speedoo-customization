import React, { useEffect, useState } from "react";
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes";
import RequestProductCard from "./requestedProduct/RequestProductCard";
import RequestedProductModal from "./requestedProduct/RequestedProductModal";
import CardSkeleton from "../skeleton/CardSkeleton";
import type { RequestedProduct } from "@/types/models";

const RequestProducts = () => {
  const [requestedProducts, setRequestedProducts] = useState<RequestedProduct[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [offset, setOffset] = useState(0);
  // `response.total` can be missing, so this can become undefined.
  const [totalRequests, setTotalRequests] = useState<number | undefined>(0);
  const [loading, setLoading] = useState(false);
  const [flag, setFlag] = useState(false);

  const REQUEST_LIMIT = 9;

  useEffect(() => {
    setOffset(0);
    getRequestedProducts(false, 0);
  }, [flag]);

  const getRequestedProducts = async (isFetchMore: boolean, bOffset: number) => {
    setLoading(true);
    try {
      const response = await api.getRequestedProducts({
        limit: REQUEST_LIMIT,
        offset: bOffset,
      });
      setTotalRequests(response.total);
      if (isFetchMore) {
        setRequestedProducts((prevRequests) => [
          ...prevRequests,
          ...response.data,
        ]);
        setOffset((offset) => offset + REQUEST_LIMIT);
        setLoading(false);
      } else {
        setRequestedProducts(response.data);
        setOffset((offset) => offset + REQUEST_LIMIT);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.log("Error", error);
    }
  };

  return (
    <div className="w-full mx-auto h-fit overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
        <h2 className="flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]">
          {t("requestedProducts")}
        </h2>
        <button
          className="shrink-0 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
          onClick={() => setShowModal(true)}
        >
          {t("requestNewProduct")}
        </button>
      </div>
      <div className="flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 items-stretch gap-4 p-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton height={200} padding="2px" key={index} />
            ))
          ) : requestedProducts.length > 0 ? (
            requestedProducts.map((request) => (
              <RequestProductCard key={request.id} request={request} />
            ))
          ) : (
            <p className="col-span-full w-full text-center text-2xl font-bold text-[var(--foreground-primary)]">
              {t("noRequestedProducts")}
            </p>
          )}
        </div>
        <div className="flex justify-center">
          {(totalRequests as number) > requestedProducts.length && (
            <button
              className="mb-4 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]"
              onClick={() => getRequestedProducts(true, offset)}
            >
              {t("load_more")}
            </button>
          )}
        </div>
      </div>

      <RequestedProductModal
        showModal={showModal}
        setShowModal={setShowModal}
        setFlag={setFlag}
      />
    </div>
  );
};

export default RequestProducts;
