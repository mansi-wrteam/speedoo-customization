import React from "react";
import { useSelector } from "react-redux";
import VerticleProductCard from "../productcards/VerticleProductCard";
import { t } from "@/utils/translation";
import CardSkeleton from "../skeleton/CardSkeleton";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import {
  ALL_PRODUCTS_PER_PAGE,
  HOME_STALE_TIME,
  allProductsQueryKey,
  fetchAllProductsPage,
} from "@/utils/homeQueries";
import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import type { ProductListResponse } from "@/types/api";
import type { Product } from "@/types/models";
import type { RootState } from "@/types/state";

const HomeAllProducts = () => {
  const city = useSelector((state: RootState) => state.City.city);
  const setting = useSelector((state: RootState) => state.Setting.setting);

  const totalProductsPerPage = ALL_PRODUCTS_PER_PAGE;

  const latitude = city?.latitude || setting?.default_city?.latitude;
  const longitude = city?.longitude || setting?.default_city?.longitude;
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isPlaceholderData,
  } = useInfiniteQuery<
    ProductListResponse<Product>,
    Error,
    InfiniteData<ProductListResponse<Product>, number>,
    QueryKey,
    number
  >({
    // The request sends X-Module-Id, so the module is part of the key. Shared
    // with the module prefetcher (homeQueries), which warms page one.
    queryKey: allProductsQueryKey(latitude, longitude, language?.id, activeModuleId),
    queryFn: ({ pageParam = 0 }) =>
      fetchAllProductsPage(latitude, longitude, activeModuleId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * totalProductsPerPage;
      return lastPage.status === 1 && nextOffset < lastPage.total!
        ? nextOffset
        : undefined;
    },
    enabled: !!(latitude && longitude),
    // On a module switch keep the old list (dimmed) until the new one lands,
    // rather than blanking to skeletons.
    placeholderData: keepPreviousData,
    staleTime: HOME_STALE_TIME,
  });

  const allProducts = data?.pages?.flatMap((page) => page.data) || [];

  const placeholderItems = Array.from({ length: 12 }).map((_, index) => index);

  if (isLoading && !data) {
    return (
      <section>
        <div className="py-3 md:py-6 container px-2">
          <div className="flex flex-col gap-3">
            <h2 className="m-0 text-xl sm:text-2xl font-bold leading-8 text-[var(--foreground-primary)]">
              {t("allProducts")}
            </h2>
            <div className="grid grid-cols-12 gap-2">
              {placeholderItems.map((index) => (
                <div
                  key={index}
                  className="col-span-6 sm:col-span-6 md:col-span-4 lg:col-span-3 xl:col-span-2"
                >
                  <CardSkeleton height={300} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return allProducts.length > 0 ? (
    <section
      aria-busy={isPlaceholderData}
      className={`transition-opacity duration-200 ${isPlaceholderData ? "opacity-60" : ""}`}
    >
      <div className="py-3 md:py-6 container px-2">
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-xl sm:text-2xl font-bold leading-8 text-[var(--foreground-primary)]">
            {t("allProducts")}
          </h2>

          <div className="grid grid-cols-12 gap-2">
            {allProducts.map((product) => (
              <div
                key={product?.id}
                className="col-span-6 sm:col-span-6 md:col-span-4 lg:col-span-3 xl:col-span-3 2xl:col-span-2"
              >
                <VerticleProductCard product={product} />
              </div>
            ))}
          </div>

          {isFetchingNextPage && (
            <div className="grid grid-cols-12 gap-2 mt-2">
              {placeholderItems.map((index) => (
                <div
                  key={index}
                  className="col-span-6 sm:col-span-6 md:col-span-4 lg:col-span-3 xl:col-span-2"
                >
                  <CardSkeleton height={300} />
                </div>
              ))}
            </div>
          )}

          {hasNextPage && (
            <div className="flex justify-center mt-4">
              <button
                className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {t("load_more")}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  ) : (
    <></>
  );
};

export default HomeAllProducts;

