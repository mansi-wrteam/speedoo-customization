import React, { useEffect, useState } from "react";
import { useServerData } from "@/utils/useServerData";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import { useDispatch, useSelector } from "react-redux";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { useRedirectHomeOnModuleChange } from "@/utils/useRedirectHomeOnModuleChange";
import * as api from "@/api/apiRoutes";
import BrandCard from "./BrandCard";
import { setFilterBrands } from "@/redux/slices/productFilterSlice";
import CardSkeleton from "../skeleton/CardSkeleton";
import { t } from "@/utils/translation"; // Assuming you have a translation utility
import { resolveCardBg } from "@/lib/utils";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Brand } from "@/types/models/catalog";

const Brands = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();
  const brandsPerPage = 12;
  const city = useSelector((state: RootState) => state.City);

  // A user module switch invalidates this module's brands → go home.
  useRedirectHomeOnModuleChange();

  // Page 1 as the server already fetched it (SSR_PLAN.md §3.5, channel 3).
  const serverBrands = useServerData<{
    data: Brand[];
    total: number;
    light: string | null;
    dark: string | null;
  }>("brands");

  const [brands, setBrands] = useState<Brand[]>(serverBrands?.data ?? []);
  const [brandGlobal, setBrandGlobal] = useState<{ light?: string | null; dark?: string | null }>(
    serverBrands ? { light: serverBrands.light, dark: serverBrands.dark } : {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [totalBrands, setTotalBrands] = useState(serverBrands?.total ?? 0);
  const [page, setPage] = useState(1);

  const language = useSelector((state: RootState) => state.Language.selectedLanguage)
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const isDark = theme === "dark";

  useEffect(() => {
    setPage(1);
  }, [city?.city?.latitude, city?.city?.longitude]);

  // Skips only the FIRST run, and only when the server already fetched page 1.
  // Every later run — a page change, a city change, a language change — still
  // fetches, because the inputs have moved.
  const skipFirstBrandFetch = React.useRef(Boolean(serverBrands));
  useEffect(() => {
    if (skipFirstBrandFetch.current) {
      skipFirstBrandFetch.current = false;
      return;
    }
    const offset = (page - 1) * brandsPerPage;
    fetchBrands(offset);
  }, [page, city,language?.id]);

  const fetchBrands = async (offset = 0) => {
    setIsLoading(true);
    try {
      const response = await api.getBrands({
        limit: brandsPerPage,
        offset,
        latitude: city?.city?.latitude,
        longitude: city?.city?.longitude,
      });
      setBrands(response.data || []);
      setBrandGlobal({
        light: response?.brand_background_color_light_theme,
        dark: response?.brand_background_color_dark_theme,
      });
      setTotalBrands(response?.total || 0); // Assuming total count is in response.data.total
    } catch (error) {
      console.log("Error fetching brands:", error);
    }
    setIsLoading(false);
  };

  const handleBrandClick = (brand: Brand) => {
    dispatch(setFilterBrands({ data: [brand?.id] }));
    router.push("/products");
  };

  const totalPages = Math.ceil(totalBrands / brandsPerPage);

  return (
    <section>
      <BreadCrumb />
      <div className="container px-3">
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 h-auto my-5 px-2">
          {isLoading
            ? Array.from({ length: brandsPerPage }).map((_, index) => (
                <div key={index} className="col-span-1">
                  <CardSkeleton height={150} />
                </div>
              ))
            : brands.map((brand) => (
                <div
                  key={brand?.id}
                  className="col-span-1 cursor-pointer"
                  onClick={() => handleBrandClick(brand)}
                >
                  <BrandCard
                    brand={brand}
                    bgColor={resolveCardBg({
                      item: brand,
                      globalLight: brandGlobal.light,
                      globalDark: brandGlobal.dark,
                      isDark,
                    })}
                  />
                </div>
              ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center my-6 gap-2 flex-wrap">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
                page === 1
                  ? "cursor-not-allowed bg-[var(--surface-disabled)] text-[var(--foreground-disabled)] outline-[var(--border-disabled)]"
                  : "bg-[var(--surface-default)] text-[var(--foreground-primary)] outline-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {t("prev")}
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
                    page === pageNumber
                      ? "bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)] outline-[var(--brand-background-default)]"
                      : "bg-[var(--surface-default)] text-[var(--foreground-primary)] outline-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              onClick={() =>
                setPage((prev) => (prev < totalPages ? prev + 1 : prev))
              }
              disabled={page === totalPages}
              className={`px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
                page === totalPages
                  ? "cursor-not-allowed bg-[var(--surface-disabled)] text-[var(--foreground-disabled)] outline-[var(--border-disabled)]"
                  : "bg-[var(--surface-default)] text-[var(--foreground-primary)] outline-[var(--border-subtle)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {t("next")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Brands;
