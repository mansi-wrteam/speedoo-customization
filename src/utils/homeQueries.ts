import { useCallback } from "react";
import { useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "@/api/apiRoutes";
import type { Id, Numeric } from "@/types/common";
import type { ShopData } from "@/types/models";
import type { RootState } from "@/types/state";

// Home's two module-scoped queries, shared between the components that read
// them and the prefetcher that warms them for modules not yet switched to.
// Keys must match exactly or a prefetch lands in a cache nobody reads.

type Coord = Numeric | null | undefined;

export const HOME_STALE_TIME = 1000 * 60 * 5;
export const ALL_PRODUCTS_PER_PAGE = 12;

export const shopQueryKey = (
  latitude: Coord,
  longitude: Coord,
  languageId: Id | null | undefined,
  isRefetch: unknown,
  moduleId: Id | null | undefined
) => ["shopData", latitude, longitude, languageId, isRefetch, moduleId] as const;

export const fetchShopData = async (
  latitude: Coord,
  longitude: Coord,
  moduleId: Id | null | undefined
): Promise<ShopData> => {
  const response = await api.getShop({
    latitude: parseFloat(latitude as string),
    longitude: parseFloat(longitude as string),
    module_id: moduleId ?? undefined,
  });
  // Only a valid payload counts. Anything else is an ERROR, not empty data:
  // a resolved `null` was cached for HOME_STALE_TIME, so switching to that
  // module kept the previous module's sections on screen (and clickable)
  // under the new module's chip. Errors aren't cached as data and refetch.
  if (response?.status == 1 && response?.data) return response.data;
  throw new Error(response?.message || "Shop data unavailable");
};

export const allProductsQueryKey = (
  latitude: Coord,
  longitude: Coord,
  languageId: Id | null | undefined,
  moduleId: Id | null | undefined
) => ["home-all-products", latitude, longitude, languageId, moduleId] as const;

export const fetchAllProductsPage = (
  latitude: Coord,
  longitude: Coord,
  moduleId: Id | null | undefined,
  offset: number
) =>
  api.getProductByFilter({
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    filters: { limit: ALL_PRODUCTS_PER_PAGE, offset },
    // The request sends X-Module-Id, so it must name the module explicitly
    // when prefetching one that isn't active yet.
    module_id: moduleId ?? undefined,
  });

const hasCoords = (latitude: Coord, longitude: Coord) =>
  Number.isFinite(parseFloat(latitude as string)) &&
  Number.isFinite(parseFloat(longitude as string));

/**
 * Warms Home for a module — shop sections and the first All Products page — so
 * switching to it renders straight from cache. Fresh entries are skipped
 * (staleTime), so calling it repeatedly costs nothing.
 */
export const useModuleHomePrefetch = () => {
  const queryClient = useQueryClient();
  const city = useSelector((state: RootState) => state.City.city);
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const languageId = useSelector((state: RootState) => state.Language.selectedLanguage?.id);
  const isRefetch = useSelector((state: RootState) => state.Shop.isRefetch);

  return useCallback(
    async (moduleId: Id | null | undefined) => {
      if (moduleId == null) return;
      // Same coordinates each query keys on (All Products falls back to the
      // default city; the shop query does not).
      const shopLat = city?.latitude;
      const shopLng = city?.longitude;
      const listLat = city?.latitude || setting?.default_city?.latitude;
      const listLng = city?.longitude || setting?.default_city?.longitude;

      const tasks: Promise<unknown>[] = [];
      if (hasCoords(shopLat, shopLng)) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: shopQueryKey(shopLat, shopLng, languageId, isRefetch, moduleId),
            queryFn: () => fetchShopData(shopLat, shopLng, moduleId),
            staleTime: HOME_STALE_TIME,
          })
        );
      }
      if (listLat && listLng) {
        tasks.push(
          queryClient.prefetchInfiniteQuery({
            queryKey: allProductsQueryKey(listLat, listLng, languageId, moduleId),
            queryFn: ({ pageParam }) =>
              fetchAllProductsPage(listLat, listLng, moduleId, pageParam as number),
            initialPageParam: 0,
            staleTime: HOME_STALE_TIME,
          })
        );
      }
      await Promise.allSettled(tasks);
    },
    [queryClient, city?.latitude, city?.longitude, setting?.default_city, languageId, isRefetch]
  );
};
