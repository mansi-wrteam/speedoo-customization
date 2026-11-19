import React, { useEffect, useState } from "react";
import { useServerData } from "@/utils/useServerData";
import { useServerSeed } from "@/utils/useServerSeed";
import { LocalizedLink } from "@/utils/localizedNav";
import type { CategoriesResponse } from "@/api/apiRoutes";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import * as api from "@/api/apiRoutes";
import { useQuery } from "@tanstack/react-query";
import CategoryCard from "./CategoryCard";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { useRedirectHomeOnModuleChange } from "@/utils/useRedirectHomeOnModuleChange";
import { useDispatch, useSelector } from "react-redux";
import {
  setFilterCategory,
  setSelectedCategories,
  setListingSource,
  setCategorySlug,
  setCategoryBreadcrumb,
} from "@/redux/slices/productFilterSlice";
import CardSkeleton from "../skeleton/CardSkeleton";
import { t } from "@/utils/translation";
import { resolveCardBg } from "@/lib/utils";
import type { AppDispatch } from "@/redux/hooks";
import type { Category as CategoryModel } from "@/types/models/catalog";
import type { RootState } from "@/types/state";

const Category = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();
  // Route is a catch-all ([...slug]) → router.query.slug is an array
  const rawSlug = router.query.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[rawSlug.length - 1] : rawSlug;
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const theme = useSelector((state: RootState) => state.Theme.theme);

  // A user module switch invalidates this module's categories → go home.
  useRedirectHomeOnModuleChange();
  const isDark = theme === "dark";
  // const [categories, setCategories] = useState([]);
  // const [isLoading, setIsLoading] = useState(false);
  // const [totalCategories, setTotalCategories] = useState(0);

  const [page, setPage] = useState(1);
  const categoryPerPage = 18;
  const slug_id = slug === "all" ? "" : slug;

  // // Reset page when slug changes
  // useEffect(() => {
  //   setPage(1);
  // }, [slug_id]);

  // useEffect(() => {
  //   const offset = (page - 1) * categoryPerPage;
  //   fetchCategories(slug_id, offset);
  // }, [page, language]);

  // const fetchCategories = async ({ queryKey }) => {
  //   const [_key, page, slug_id, language] = queryKey;

  //   const offset = (page - 1) * categoryPerPage;

  //   return api.getCategories({
  //     limit: categoryPerPage,
  //     offset,
  //     slug: slug_id,
  //   });
  // };

  // Page 1 of the all-categories grid, already fetched by the server.
  const serverAllCategories = useServerData<CategoriesResponse>("allCategories");

  const {
    data: categoriesResponse,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["categories", page, slug_id, language?.id, activeModuleId],
    queryFn: async ({ queryKey }) => {
      const [_key, page, slug_id] = queryKey as unknown as [string, number, string | undefined];
      const offset = (page - 1) * categoryPerPage;

      return api.getCategories({
        limit: categoryPerPage,
        offset,
        slug: slug_id,
      });
    },
    // Scoped to the key the SERVER rendered. `initialData` is not key-aware —
    // React Query applies it to whichever key the component currently computes —
    // so without this a module, city or language switch seeded the NEW key with
    // the OLD payload and, with staleTime below, never refetched it.
    initialData: useServerSeed(serverAllCategories, [page, slug_id, language?.id, activeModuleId]),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const categories = categoriesResponse;
  const totalCategories = categoriesResponse?.total || 0;

  const categoryBreadcrumb = useSelector(
    (state: RootState) => state.ProductFilter.categoryBreadcrumb,
  );

  useEffect(() => {
    dispatch(setCategoryBreadcrumb({ data: [] }));
  }, [dispatch]);

  const totalPages = Math.ceil(totalCategories / categoryPerPage);

  const title = categoryBreadcrumb?.find((c) => c.slug === slug)?.name;

  return (
    <section>
      <BreadCrumb title={title} />
      <div className="container">
        <div
          className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4 h-auto my-5 px-2`}
        >
          {isLoading
            ? Array.from({ length: categoryPerPage }).map((_, index) => (
              <div key={index} className="col-span-1">
                <CardSkeleton variant="category" />
              </div>
            ))
            : categories?.data?.map((category) => (
              // A real anchor, not a div with onClick. Google follows
              // <a href>; it does not fire click handlers, so while this was a
              // div the whole category tree was unreachable from the grid even
              // though the grid itself is server-rendered.
              <LocalizedLink
                key={category?.id}
                href={`/categories/${category?.slug}`}
                className="col-span-1 block"
              >
                <CategoryCard
                  category={category}
                  imageSize={122}
                  bgColor={resolveCardBg({
                    item: category,
                    globalLight: categories?.category_background_color_light_theme,
                    globalDark: categories?.category_background_color_dark_theme,
                    isDark,
                  })}
                />
              </LocalizedLink>
            ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center my-6 gap-2 flex-wrap">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline outline-1 -outline-offset-1 ${page === 1
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline outline-1 -outline-offset-1 ${page === pageNumber
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 outline outline-1 -outline-offset-1 ${page === totalPages
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

export default Category;
