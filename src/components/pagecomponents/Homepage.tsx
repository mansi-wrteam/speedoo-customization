import React, { useEffect, useState } from "react";
import Home from "@/components/homepage/Home";
import { setShop } from "@/redux/slices/shopSlice";
import { useSelector, useDispatch } from "react-redux";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerData } from "@/utils/useServerData";
import { useServerSeed } from "@/utils/useServerSeed";

import Loader from "../loader/Loader";
import Layout from "../layout/Layout";
// import { resetSelectedCategories } from '@/redux/slices/productFilterSlice'
import { useRouter } from "next/router";
import { clearAllFilter } from "@/redux/slices/productFilterSlice";
import { setDisplayedModuleId } from "@/redux/slices/uiSlice";
import {
  HOME_STALE_TIME,
  fetchShopData,
  shopQueryKey,
} from "@/utils/homeQueries";
import ModuleSwitchProgress from "../homepage/ModuleSwitchProgress";
import HomeSkeleton from "../homepage/HomeSkeleton";
import LocationRequiredPrompt from "../homepage/LocationRequiredPrompt";
import BackToTop from "../common/BackToTop";
import type { RootState } from "@/types/state";
import type { ShopData } from "@/types/models";
import type { AppDispatch } from "@/redux/hooks";
import { t } from "@/utils/translation";


const Homepage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const isRefetch = useSelector((state: RootState) => state.Shop.isRefetch)
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const city = useSelector((state: RootState) => state.City.city);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);

  // Present when the server rendered this page; also already in redux via
  // applySsrSeed, which is what <Home /> actually reads.
  const serverShop = useServerData<ShopData>("shop");

  // The shop endpoint is city-scoped; without real coordinates there is nothing
  // to ask for. See `enabled` below.
  const hasCoords =
    Number.isFinite(parseFloat(city?.latitude as string)) &&
    Number.isFinite(parseFloat(city?.longitude as string));

  const [loading, setLoading] = useState(false);

  useEffect(() => { }, [language?.id]);

  useEffect(() => {
    if (router?.pathname === "/") {
      dispatch(clearAllFilter());
    }
  }, []);
  

  
  const { isLoading, data, isPlaceholderData, isError, refetch } = useQuery({
    queryKey: shopQueryKey(city?.latitude, city?.longitude, language?.id, isRefetch, activeModuleId),
    // Redux is written by the effect below, not here: queryFn also runs for
    // prefetches of modules that aren't on screen. Invalid payloads come back
    // null, so they can't replace the Home that is showing.
    queryFn: () => fetchShopData(city?.latitude, city?.longitude, activeModuleId),

    // Guarded on usable COORDINATES, not on the city object existing.
    //
    // `queryFn` does `parseFloat(city?.latitude)`, which is `NaN` when the city
    // has no coordinates — and the request then goes out as
    // `?latitude=NaN&longitude=NaN`, which the API answers with a 500:
    //
    //   round(): Argument #1 ($num) must be of type int|float, string given
    //
    // A city without coordinates is a normal state: `settings.default_city` is
    // not set on every deployment, and a visitor who has not chosen one has
    // nothing better. Previously `!!city` let those through because the object
    // itself was truthy.
    enabled: hasCoords,

    // The server already fetched this and seeded redux with it. Supplying it
    // here too stops React Query refetching on mount — queryFn returns the
    // UNWRAPPED payload (above), so the seed is the unwrapped shape as well.
    // Scoped to the key the SERVER rendered. `initialData` is not key-aware —
    // React Query applies it to whichever key the component currently computes —
    // so without this a module, city or language switch seeded the NEW key with
    // the OLD payload and, with staleTime below, never refetched it.
    initialData: useServerSeed(serverShop, [
      city?.latitude,
      city?.longitude,
      language?.id,
      isRefetch,
      activeModuleId,
    ]),

    // A module (or city/language) switch keeps the current Home on screen —
    // dimmed, with a progress bar — instead of dropping to the skeleton, then
    // swaps in one go. The skeleton is only for a first load with nothing to show.
    placeholderData: keepPreviousData,

    staleTime: HOME_STALE_TIME,
    gcTime: 1000 * 60 * 30,
    // One retry: a "we don't deliver here" answer won't change on a third ask.
    retry: 1,
  });

  const switching = isPlaceholderData && !isError;
  
  // `hasCoords` as well as the language: a manual `refetch()` IGNORES `enabled`,
  // so this effect fired the request even when the query above was switched off
  // for want of coordinates — which is how `?latitude=NaN&longitude=NaN` reached
  // the API and came back 500.
  useEffect(() => {
    if (language?.id && hasCoords) {
      refetch();
    }
  }, [language?.id, hasCoords]);

  // Commit the new module's content and its theme in the same update: the
  // theme follows `displayedModuleId` (see Layout), so colours no longer flip
  // on click while the old content is still showing. Covers cache hits too,
  // where queryFn doesn't re-run.
  useEffect(() => {
    if (!hasCoords) {
      dispatch(setDisplayedModuleId(null));
      return;
    }
    if (switching) return;
    if (data) dispatch(setShop({ data }));
    dispatch(setDisplayedModuleId(activeModuleId));
  }, [data, switching, activeModuleId, hasCoords, dispatch]);

  // Other pages theme straight from the active module.
  useEffect(() => () => {
    dispatch(setDisplayedModuleId(null));
  }, [dispatch]);

  // Other modules are NOT warmed in the background: each module's /shop is
  // hundreds of KB and seconds of server time, so preloading all of them cost
  // every first visit ~450 KB and three slow calls for modules most visitors
  // never open. Hovering or pressing a module pill (Header) warms that one
  // just before the switch instead.

  const showLoading = isLoading && !data;
  // This module's Home failed to load and there is nothing of its own to show.
  // Redux still holds the PREVIOUS module's sections — rendering <Home /> now
  // would show them, clickable, under this module's chip.
  const loadFailed = isError && !data;

  return (
    <div>
      {
        <Layout>
          {/* No coordinates means every product call would be rejected, so
              ask for a location instead of rendering an empty, broken Home
              (§8). It reloads itself once the picker sets one, because the
              query is keyed on the city. */}
          {!hasCoords ? (
            <LocationRequiredPrompt />
          ) : loadFailed ? (
            <div className="container flex flex-col items-center justify-center gap-3 py-24 text-center">
              <h2 className="text-xl font-bold text-[var(--foreground-primary)]">
                {t("something_went_wrong")}
              </h2>
              <p className="text-sm text-[var(--foreground-secondary)]">{t("no_data_found")}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2 text-base font-medium text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
              >
                {t("try_again")}
              </button>
            </div>
          ) : showLoading ? (
            <div>
              {" "}
              <HomeSkeleton />
            </div>
          ) : (
            <>
              <ModuleSwitchProgress active={switching} />
              <div
                aria-busy={switching}
                className={`transition-opacity duration-200 ${
                  switching ? "pointer-events-none opacity-60" : "opacity-100"
                }`}
              >
                <Home />
              </div>
            </>
          )}
          <BackToTop />
        </Layout>
      }
    </div>
  );
};

export default Homepage;
