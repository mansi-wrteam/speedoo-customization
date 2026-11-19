import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Filter from "./ProductFilter";
import { t } from "@/utils/translation";
import { RiCloseFill } from "react-icons/ri";
import { useSelector } from "react-redux";
import type { ProductListResponse } from "@/types/api";
import type { Product } from "@/types/models/product";
import type { RootState } from "@/types/state";

/** Mobile filter sheet used by ProductsList and CategoryDetail. */
export interface FilterDrawerProps {
  showFilter: boolean;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
  setProductResult: React.Dispatch<React.SetStateAction<Product[]>>;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  /** Passed by the pages but not read here. */
  handlePrices: (result: ProductListResponse<Product>) => void;
  minPrice: number | null;
  maxPrice: number | null;
  values: number[];
  setValues: React.Dispatch<React.SetStateAction<number[]>>;
  setMinPrice: React.Dispatch<React.SetStateAction<number | null>>;
  setMaxPrice: React.Dispatch<React.SetStateAction<number | null>>;
  /** Passed by CategoryDetail but not read here (derived from listing_source instead). */
  hideCategory?: boolean;
  /** Passed by CategoryDetail but not read here. */
  disableFilter?: boolean;
}

const FilterDrawer = ({
  showFilter,
  setShowFilter,
  setProductResult,
  setOffset,
  minPrice,
  maxPrice,
  values,
  setValues,
  setMinPrice,
  setMaxPrice,
}: FilterDrawerProps) => {
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const {
    listing_source
  } = useSelector((state: RootState) => state.ProductFilter);


  return (
    <Sheet open={showFilter}>
      <SheetContent
        className="p-2 w-full sm:w-[900px] overflow-y-auto"
        side={language?.type == "RTL" ? "left" : "right"}
      >
        <SheetHeader className="px-0 py-3  flex justify-between text-left ">
          <SheetTitle className="text-2xl font-bold flex flex-row items-center p-0 justify-between">
            <p className="text-2xl font-bold">{t("filter")}</p>
            <div className="cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]">
              <RiCloseFill
                size={22}
                onClick={() => setShowFilter(false)}
              />
            </div>
          </SheetTitle>
        </SheetHeader>
        <div>
          <Filter
            setProductResult={setProductResult}
            setOffset={setOffset}
            minPrice={minPrice}
            maxPrice={maxPrice}
            values={values}
            setValues={setValues}
            setMaxPrice={setMaxPrice}
            setMinPrice={setMinPrice}
            setShowFilter={setShowFilter}
            hideCategory={listing_source === "category"}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FilterDrawer;
