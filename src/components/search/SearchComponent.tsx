"use client";
import React, { useEffect, useState } from "react";
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t } from "@/utils/translation";
import { setFilterCategory } from "@/redux/slices/productFilterSlice";
import { useDispatch, useSelector } from "react-redux";
import { useLocalizedRouter } from "@/utils/localizedNav";
import SearchProductCard from "../cards/SearchProductCard";
import { FaSearch } from "react-icons/fa";
import { isRtl } from "@/lib/utils";
import * as api from "@/api/apiRoutes";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id } from "@/types/common";
import type { Category } from "@/types/models";

export interface SearchComponentProps {
  /** Not read here (the category dropdown was removed from the UI). */
  handleSearchCategory: (value: Id) => void;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSuggLoading: boolean;
  // Passed by Header but never read.
  isMobile?: boolean;
  mobileSearch?: boolean;
  setMobileSearch?: React.Dispatch<React.SetStateAction<boolean>>;
}

const SearchComponent = ({
  handleSearchCategory,
  handleSearch,
  isSuggLoading,
}: SearchComponentProps) => {
  const rtl = isRtl();
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const filter = useSelector((state: RootState) => state.ProductFilter);

  useEffect(() => {
    if(showCategories){
      fetchCategories();
    }
    setShowCategories(false);
  }, [showCategories]);

  const fetchCategories = async () => {
    try {
      setIsCategoryLoading(true);
      const categories = await api.getCategories();
      setCategories(categories.data);
    } catch (error) {
      console.log("erorr", error);
    } finally {
      setIsCategoryLoading(false);
    }
  };

  const handleSearchItemClick = async () => {
    dispatch(setFilterCategory({ data: filter?.searchedCategory }));
    router.push("/products");
  };

  return (
    <>
      <div
        className={`flex w-full  h-full flex-col py-2 items-center md:flex-row md:ml-[10px]  md:p-0`}
        onClick={() => setShowCategories(true)}
      >
        {/* All-categories dropdown intentionally removed from the UI */}
        <div className="w-full flex flex-col flex-grow md:relative md:flex-row rounded-lg">
          {/* New search bar design: rounded-lg input w/ left search icon, no button */}
          <div className="self-stretch w-full h-12 px-4 py-2 rounded-lg bg-[var(--form-default-background)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus-within:outline-[var(--form-focus-filled-border)] inline-flex justify-start items-center gap-3 order-1">
            
            <input
              type="text"
              placeholder={t("iAmLookingFor")}
              className="w-full flex-grow bg-transparent text-base font-normal leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] focus:outline-none"
              value={filter?.search ? filter?.search : ""}
              onChange={(e) => handleSearch(e)}
            />
          </div>
          <div
            className="md:w-[calc(100%-126px)] mt-1 flex flex-col flex-wrap col-span-4 gap-1 order-2 rounded-lg bg-[var(--surface-default)] shadow-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] md:absolute md:z-50 md:top-12 md:left-0 md:order-2 empty:hidden"
          >
            {(router?.pathname !== "/products" && filter?.search) &&
              filter?.search_product?.map((product, idx) => (
                <SearchProductCard key={idx} product={product} />
              ))}
            {router?.pathname !== "/products" &&
              !isSuggLoading &&
              filter?.search &&
              filter?.search_product?.length === 0 && (
                <div className="px-4 py-3 text-base font-medium leading-6 text-[var(--foreground-secondary)] text-center md:text-start">
                  {t("no_product_found")}
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchComponent;
