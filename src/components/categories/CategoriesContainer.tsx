import React from "react";
import { useSsrMediaQuery } from "@/utils/useSsrMediaQuery";
import { useEffect } from "react";
import CategoryCard from "./CategoryCard";
import { t } from "@/utils/translation";
import ViewAllButton from "../view-all-button/ViewAllButton";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { useDispatch, useSelector } from "react-redux";
import { setFilterCategory } from "@/redux/slices/productFilterSlice";
import {
  setListingSource,
  setCategorySlug,
  setCategoryBreadcrumb,
} from "@/redux/slices/productFilterSlice";
import { resolveCardBg } from "@/lib/utils";
import type { AppDispatch } from "@/redux/hooks";
import type { Category, CategoryBackgroundSettings } from "@/types/models/catalog";
import type { RootState } from "@/types/state";

export interface CategoriesContainerProps {
  /** Home `shop` payload: the category list plus its list-level background settings. */
  categories?: (CategoryBackgroundSettings & { categories?: Category[] }) | null;
}

const CategoriesContainer = ({ categories }: CategoriesContainerProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();
  const selectedCategories = useSelector(
    (state: RootState) => state.ProductFilter?.selectedCategories,
  );
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const isDark = theme === "dark";
  const bgMode = categories?.category_background_color_mode;
  const bgGlobalLight = categories?.category_background_color_light_theme;
  const bgGlobalDark = categories?.category_background_color_dark_theme;
  const categoryBreadcrumb = useSelector(
    (state: RootState) => state.ProductFilter.categoryBreadcrumb,
  );

  const handleCategoryClick = (category: Category) => {
    // Navigate to the SEO-friendly category detail page
    router.push(`/categories/${category.slug}`);
  };

  useEffect(() => {
    dispatch(setCategoryBreadcrumb({ data: [] }));
  }, [dispatch]);

  // Show only 2 rows at every breakpoint (columns: base 4 / sm 4 / md 6 / lg 8)
  const isMd = useSsrMediaQuery({ minWidth: 768 });
  const isLg = useSsrMediaQuery({ minWidth: 1024 });
  const columns = isLg ? 8 : isMd ? 6 : 4;
  const visibleCategories = categories?.categories?.slice(0, columns * 2);

  return (
    <section>
      <div className="container feature-section" dir={language?.type}>
        <div className="flex justify-between items-center w-full mb-3">
          <h2 className="text-[var(--foreground-primary)] text-xl md:text-2xl font-bold leading-8 m-0">
            {t("shop_by")} {t("categories")}
          </h2>
          <ViewAllButton href="/categories/all" />
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-6">
          {visibleCategories?.map((category, index) => (
            <div key={index} onClick={() => handleCategoryClick(category)}>
              <CategoryCard
                category={category}
                bgColor={resolveCardBg({
                  mode: bgMode,
                  item: category,
                  globalLight: bgGlobalLight,
                  globalDark: bgGlobalDark,
                  isDark,
                })}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesContainer;
