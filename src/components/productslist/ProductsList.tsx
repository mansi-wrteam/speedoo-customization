import React, { useEffect, useState } from "react";
import { useServerData } from "@/utils/useServerData";
import { useServerSeed } from "@/utils/useServerSeed";
import { useInfiniteQuery } from "@tanstack/react-query";
import BreadCrumb from "../breadcrumb/BreadCrumb";
import { t } from "@/utils/translation";
import Filter from "../productFilter/ProductFilter";
import * as api from "@/api/apiRoutes";
import { useDispatch, useSelector } from "react-redux";
import { setFilterCategory } from "@/redux/slices/productFilterSlice";
import { useQuery } from "@tanstack/react-query";

import {
  setListingSource,
  setCategorySlug,
  setCategoryBreadcrumb,
} from "@/redux/slices/productFilterSlice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { useRedirectHomeOnModuleChange } from "@/utils/useRedirectHomeOnModuleChange";
import "swiper/css";
import "swiper/css/navigation";
import { BsFillGrid3X3GapFill } from "react-icons/bs";
import { FaThList } from "react-icons/fa";
import ListViewProductCard from "../productcards/ListViewProductCard";
import VerticleProductCard from "../productcards/VerticleProductCard";
import CardSkeleton from "../skeleton/CardSkeleton";
import FilterDrawer from "../productFilter/FilterDrawer";
import { IoFilter } from "react-icons/io5";
import {
  setFilterSort,
  setFilterView,
} from "@/redux/slices/productFilterSlice";
import NoOrderSvg from "@/assets/not_found_images/No_Orders.svg";
import Image from "next/image";
import type { AppDispatch } from "@/redux/hooks";
import type { ProductListResponse } from "@/types/api";
import type { Id } from "@/types/common";
import type { Category } from "@/types/models/catalog";
import type { Product } from "@/types/models/product";
import type { CategoryCrumb, RootState } from "@/types/state";

const findCategoryPath = (categories: Category[] | null | undefined, targetId: Id): Category[] | null => {
  if (!categories || !Array.isArray(categories)) return null;

  for (const category of categories) {
    if (category.id == targetId) {
      return [category];
    }
    if (category.cat_active_childs && category.cat_active_childs.length > 0) {
      const path = findCategoryPath(category.cat_active_childs, targetId);
      if (path) {
        return [category, ...path];
      }
    }
  }
  return null;
};

const Products = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();
  const city = useSelector((state: RootState) => state.City);
  // const [subCategories, setSubCategories] = useState([]);
  // const [isSubCatLoading, setIsSubCatLoading] = useState(false);
  const filter = useSelector((state: RootState) => state.ProductFilter);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);

  // A user module switch invalidates this module's product list → go home.
  useRedirectHomeOnModuleChange();

  const total_products_per_page = filter?.grid_view ? 30 : 18;

  // Only present for an unfiltered first load of /products.
  const serverProducts = useServerData<ProductListResponse<Product>>("products");
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [values, setValues] = useState<number[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(filter?.search);
  const { selectedLanguage } = useSelector((state: RootState) => state.Language);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const categoryBreadcrumb = useSelector(
    (state: RootState) => state.ProductFilter.categoryBreadcrumb,
  );

  const ancestorCategoryIds = (categoryBreadcrumb: CategoryCrumb[] | null | undefined) => {
    if (!Array.isArray(categoryBreadcrumb) || categoryBreadcrumb.length === 0) {
      return null;
    }
    return categoryBreadcrumb.map((category) => category.id).join(",");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filter?.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filter?.search]);

  

  useEffect(() => {
    if (!categoryBreadcrumb || categoryBreadcrumb.length === 0) return;
    // const needsTranslation = categoryBreadcrumb.some(cat => !cat.translations);
    
    refetchBreadcrumbTranslations();
  }, [selectedLanguage, categoryBreadcrumb.length > 0]);

  const refetchBreadcrumbTranslations = async () => {
    const updated = await Promise.all(
      categoryBreadcrumb.map(async (category) => {
        try {
          const res = await api.getCategories({
            slug: category.slug,
            is_own_data: 1,
          });
          const data = res?.data;

          // Find the matched category from the response array to avoid taking the first one if the API returns a list
          const matchedCategory = Array.isArray(data)
            ? data.find((c) => c.slug === category.slug || c.id === category.id)
            : data;

          if (!matchedCategory) return category;

          return {
            ...category,
            name: matchedCategory?.translations?.name || matchedCategory?.name || category.name,
            translations: matchedCategory?.translations || category.translations,
          };
        } catch (error) {
          return category;
        }
      }),
    );

    // Only dispatch if there's an actual change to avoid infinite loops
    const isDifferent = JSON.stringify(updated) !== JSON.stringify(categoryBreadcrumb);
    if (isDifferent) {
    dispatch(setCategoryBreadcrumb({ data: updated }));
    }
  };

  const resolvedCategory =
    filter?.category_id === "NaN" || filter?.category_id === "all categories"
      ? null
      : filter?.category_id;

  const finalCategoryIds = resolvedCategory;

  const fetchProducts = async ({ pageParam = 0 }: { pageParam?: number }) => {
    const filterParams = {
      min_price: filter.price_filter?.min_price,
      max_price: filter.price_filter?.max_price,
      ...(finalCategoryIds && {
        category_ids: finalCategoryIds,
      }),
      brand_ids: filter?.brand_ids.toString(),
      sort: filter?.sort_filter,
      search: debouncedSearch,
      limit: total_products_per_page,
      sizes: filter?.search_sizes
        ?.filter((obj) => obj.checked)
        .map((obj) => obj["size"])
        .join(","),
      offset: pageParam,
      unit_ids: filter?.search_sizes
        ?.filter((obj) => obj.checked)
        .map((obj) => obj["unit_id"])
        .join(","),
      seller_id: filter?.seller_id,
      country_id: filter?.country_id,
      section_id: filter?.section_id,
    };

    return await api.getProductByFilter({
      latitude: city.city!.latitude,
      longitude: city.city!.longitude,
      filters: filterParams,
    });
  };

  // Hoisted: a hook cannot be called inside the options object below.
  const scopedServerProducts = useServerSeed(serverProducts, [
    { ...filter, search: debouncedSearch },
    city?.city?.latitude,
    city?.city?.longitude,
    language?.id,
    resolvedCategory,
    activeModuleId,
  ]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: [
      "products",
      { ...filter, search: debouncedSearch },
      city?.city?.latitude,
      city?.city?.longitude,
      language?.id,
      resolvedCategory,
      activeModuleId,
    ],
    queryFn: fetchProducts,
    // The server already fetched the unfiltered first page (SSR_PLAN.md §3.5).
    // `initialData` seeds whatever key the line above computed, so the key never
    // has to be reproduced server-side — the failure mode §7.5 guards against
    // cannot occur. Undefined whenever the server did not provide a page: the
    // static export, a non-default language, a filtered request, or any
    // client-side navigation.
    // Scoped to the key the SERVER rendered. `initialData` is not key-aware —
    // React Query applies it to whichever key the component currently computes —
    // so without this a module, city or language switch seeded the NEW key with
    // the OLD payload and, with staleTime below, never refetched it.
    initialData: scopedServerProducts
      ? { pages: [scopedServerProducts], pageParams: [0] }
      : undefined,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.data || lastPage.data.length < total_products_per_page) {
        return undefined;
      }
      return allPages.length * total_products_per_page;
    },
    initialPageParam: 0,
  });

  const productResult = data?.pages?.flatMap((page) => page?.data ?? []) ?? [];
  const totalProducts = data?.pages?.[0]?.total || 0;
  const loading = isLoading;
  const isLoadMoreLoading = isFetchingNextPage;
  
  const setProductResult = () => { };
  const setOffset = () => { };

  useEffect(() => {
    if (data?.pages?.[0]) {
      handlePrices(data.pages[0]);
    }
  }, [data]);

  const handlePrices = async (result: ProductListResponse<Product>) => {
    if (
      filter?.price_filter?.min_price !== undefined &&
      filter?.price_filter?.min_price !== null &&
      filter?.price_filter?.max_price !== null &&
      filter?.price_filter?.max_price !== undefined
    ) {
      setValues([
        parseInt(filter?.price_filter?.min_price as string),
        parseInt(filter?.price_filter?.max_price as string),
      ]);
      setMinPrice(parseInt(result?.total_min_price as string));
      setMaxPrice(parseInt(result?.total_max_price as string));
    } else {
      setMinPrice(parseInt(result?.total_min_price as string));
      if (result.total_min_price === result.total_max_price) {
        setMaxPrice(parseInt(result?.total_max_price as string) + 100);
        setValues([
          parseInt(result?.total_min_price as string),
          parseInt(result?.total_max_price as string) + 100,
        ]);
      } else {
        setMaxPrice(parseInt(result?.total_max_price as string));
        setValues([
          parseInt(result?.total_min_price as string),
          parseInt(result?.total_max_price as string),
        ]);
      }
    }
  };

  const handleGridViewChange = () => {
    dispatch(setFilterView({ data: true }));
  };
  const handleListViewChange = () => {
    dispatch(setFilterView({ data: false }));
  };

  const handleFetchMore = async () => {
    fetchNextPage();
  };

  const sortProduct = async (value: string) => {
    dispatch(setFilterSort({ data: value }));
  };

  const placeholderItems = Array.from({ length: 12 }).map((_, index) => index);

  // Legacy category URLs (/products?source=category&category=<slug>) now live at
  // /categories/<slug>. Redirect so old shared/bookmarked links keep working.
  useEffect(() => {
    if (!router.isReady) return;
    const { source, category: slug_from_url } = router.query;
    if (source === "category" && slug_from_url) {
      router.replace(`/categories/${slug_from_url}`);
    }
  }, [router.isReady, router.query]);

  
  return (
    <section>
      <div>
        <div>
          <BreadCrumb />
        </div>
        <div className="container px-2">
          <div className="sticky top-0 z-30 bg-[var(--background-default)] pt-0.5 md:hidden">
            <div
              className="mt-3.5 flex w-full cursor-pointer items-center gap-2 rounded-lg p-3 text-base font-medium leading-6 text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
              onClick={() => setShowFilter(true)}
            >
              <IoFilter />
              {t("filter")}
            </div>
          </div>
          <div className="mb-5  md:my-8 grid grid-cols-12 gap-6">
            <div className=" col-span-3 rounded-sm hidden md:block ">
              <Filter
                setProductResult={setProductResult}
                setOffset={setOffset}
                handlePrices={handlePrices}
                minPrice={minPrice}
                maxPrice={maxPrice}
                values={values}
                setValues={setValues}
                setMaxPrice={setMaxPrice}
                setMinPrice={setMinPrice}
                hideCategory={false}
                disableFilter={false}
              />
            </div>
            <div className="col-span-12 md:col-span-9">
              <div
                className={`mb-6 sticky top-[56px] z-20 bg-[var(--background-default)] pt-5 md:static md:py-0`}
              >
                {loading ? (
                  <CardSkeleton height={70} />
                ) : (
                  <div
                    className={` flex justify-between flex-col md:flex-row  md:items-center p-4 border border-[var(--border-subtle)] rounded-lg gap-1 md:gap-0  bg-[var(--surface-subtle)]  `}
                  >
                    <p className="text-base font-normal text-[var(--foreground-primary)] order-2 md:order-1">
                      {totalProducts} {t("products_found")}
                    </p>
                    <div className="flex justify-between gap-3 order-1 md:order-2 ">
                      <div className="flex  gap-2 items-center">
                        <p className="text-sm text-nowrap font-normal text-[var(--foreground-primary)]">
                          {t("sortBy")}
                        </p>
                        <Select
                          onValueChange={sortProduct}
                          value={filter?.sort_filter}
                        >
                          <SelectTrigger className="w-[120px] md:w-[150px] lg:w-[200px] h-full px-3 py-2 rounded-lg bg-[var(--form-default-background)] border border-[var(--form-default-border)] text-base text-[var(--form-default-text)] [&>svg]:text-[var(--form-default-icon)] [&>svg]:opacity-100">
                            <SelectValue placeholder={t("default")} />
                          </SelectTrigger>
                          <SelectContent className="w-[120px] md:w-[150px] lg:w-[200px] h-full z-30  hidden md:block lg:block bg-[var(--surface-default)] border-[var(--border-subtle)] text-[var(--foreground-primary)]">
                            <SelectItem value="default">
                              {t("default")}
                            </SelectItem>
                            <SelectItem value="new">
                              {t("newest_first")}
                            </SelectItem>
                            <SelectItem value="old">
                              {t("oldest_first")}
                            </SelectItem>
                            <SelectItem value="high">
                              {t("high_to_low")}
                            </SelectItem>
                            <SelectItem value="low">
                              {t("low_to_high")}
                            </SelectItem>
                            <SelectItem value="discount">
                              {t("discount_high_to_low")}
                            </SelectItem>
                            <SelectItem value="popular">
                              {t("popularity")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex  gap-2 items-center">
                        <span
                          className={`p-1.5 rounded-sm ${filter?.grid_view
                            ? "bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)] shadow-[0px_14px_36px_3px_rgba(150,150,161,0.18)]"
                            : "text-[var(--foreground-primary)]"
                            } hover:cursor-pointer`}
                        >
                          <BsFillGrid3X3GapFill
                            size={23}
                            onClick={handleGridViewChange}
                          />
                        </span>
                        <span
                          className={`p-1.5 rounded-sm ${!filter?.grid_view
                            ? "bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)] shadow-[0px_14px_36px_3px_rgba(150,150,161,0.18)]"
                            : "text-[var(--foreground-primary)]"
                            } hover:cursor-pointer`}
                        >
                          <FaThList size={23} onClick={handleListViewChange} />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-12 gap-x-2 gap-y-4 sm:gap-3 md:gap-4 h-full">
                  {loading ? (
                    placeholderItems.map((index) => {
                      return filter?.grid_view ? (
                        <div
                          className="col-span-4 lg:col-span-3 xl:col-span-2"
                          key={index}
                        >
                          <CardSkeleton variant="grid" />
                        </div>
                      ) : (
                        <div className="col-span-12 lg:col-span-6">
                          <CardSkeleton variant="list" />
                        </div>
                      );
                    })
                  ) : productResult?.length <= 0 ? (
                    <div className="flex flex-col justify-center items-center col-span-12">
                      <div className="h-3/4 w-3/4">
                        <Image
                          src={NoOrderSvg}
                          alt="Product not found"
                          width={320}
                          height={320}
                          className="h-full w-full"
                        />
                      </div>
                      <h2 className="font-bold text-2xl">
                        {t("no_product_found")}
                      </h2>
                    </div>
                  ) : (
                    productResult?.map((product) => {
                      return filter?.grid_view ? (
                        <div
                          className="col-span-4 lg:col-span-3 xl:col-span-2"
                          key={product?.id}
                        >
                          <VerticleProductCard product={product} compact />
                        </div>
                      ) : (
                        <div className="col-span-12 lg:col-span-6" key={product?.id}>
                          <ListViewProductCard product={product} />
                        </div>
                      );
                    })
                  )}

                  {isLoadMoreLoading ? (
                    placeholderItems.map((index) => {
                      return filter?.grid_view ? (
                        <div
                          className="col-span-4 lg:col-span-3 xl:col-span-2"
                          key={index}
                        >
                          <CardSkeleton variant="grid" />
                        </div>
                      ) : (
                        <div className="col-span-12">
                          <CardSkeleton variant="list" />
                        </div>
                      );
                    })
                  ) : (
                    <></>
                  )}
                  <div className="col-span-12 mt-6 w-full flex justify-center mx-auto">
                    {totalProducts > productResult?.length ? (
                      <button
                        className="px-4 py-2 bg-[var(--button-secondary-background-default)] hover:bg-[var(--button-secondary-background-hover)] rounded-lg inline-flex justify-center items-center gap-1 text-[var(--button-secondary-foreground-default)] text-base font-bold transition-colors"
                        onClick={handleFetchMore}
                      >
                        {t("load_more")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FilterDrawer
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        setProductResult={setProductResult}
        setOffset={setOffset}
        handlePrices={handlePrices}
        minPrice={minPrice}
        maxPrice={maxPrice}
        values={values}
        setValues={setValues}
        setMaxPrice={setMaxPrice}
        setMinPrice={setMinPrice}
      />
    </section>
  );
};

export default Products;
