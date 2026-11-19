import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Id } from "@/types/common";
import type { Product } from "@/types/models/product";
import type { DataPayload, ProductFilterState } from "@/types/state";

const initialState: ProductFilterState = {
  search: null,
  section_id: null,
  brand_ids: [],
  category_id: null,
  grid_view: true,
  price_filter: null,
  sort_filter: "",
  search_sizes: [],
  seller_id: "",
  country_id: "",
  search_product: [],
  selectedCategories: [],
  searchedCategory: "",
  listing_source: "all",
  category_slug: "",
  categoryBreadcrumb: [],
};

export const productFilterReducer = createSlice({
  name: "productFilter",
  initialState,
  reducers: {
    setFilterSearch: (state, action: PayloadAction<DataPayload<string | null>>) => {
      state.search = action.payload.data;
    },
    setFilterSection: (state, action: PayloadAction<DataPayload<Id | null>>) => {
      state.section_id = action.payload.data;
    },
    setFilterBrands: (state, action: PayloadAction<DataPayload<Id[]>>) => {
      state.brand_ids = action.payload.data;
    },
    setFilterCategory: (state, action: PayloadAction<DataPayload<Id | null>>) => {
      state.category_id = action.payload.data;
    },
    setFilterView: (state, action: PayloadAction<DataPayload<boolean>>) => {
      state.grid_view = action.payload.data;
    },
    setFilterMinMaxPrice: (state, action: PayloadAction<DataPayload<ProductFilterState["price_filter"]>>) => {
      state.price_filter = action.payload.data;
    },
    setFilterSort: (state, action: PayloadAction<DataPayload<string>>) => {
      state.sort_filter = action.payload.data;
    },
    setFilterProductSizes: (state, action: PayloadAction<DataPayload<ProductFilterState["search_sizes"]>>) => {
      state.search_sizes = action.payload.data;
    },
    setFilterBySeller: (state, action: PayloadAction<DataPayload<Id>>) => {
      state.seller_id = action.payload.data;
    },
    setFilterByCountry: (state, action: PayloadAction<DataPayload<Id>>) => {
      state.country_id = action.payload.data;
    },
    setProductBySearch: (state, action: PayloadAction<DataPayload<Product[]>>) => {
      state.search_product = action.payload.data;
    },
    setFilterSellers: (state, action: PayloadAction<DataPayload<Id>>) => {
      state.seller_id = action.payload.data;
    },
    clearAllFilter: (state, action: PayloadAction<{ preserveCategory?: boolean } | undefined>) => {
      const { preserveCategory } = action.payload || {};
      state.country_id = "";
      state.brand_ids = [];
      state.seller_id = "";
      // state.category_id = "";
      state.section_id = null;
      state.search = null;
      state.price_filter = null;
      state.search_product = [];
      state.selectedCategories = [];
      state.searchedCategory = "";
      if (!preserveCategory) {
        state.category_id = "";
        state.category_slug = "";
        state.categoryBreadcrumb = [];
        state.listing_source = "all";
      }
    },
    setSelectedCategories: (state, action: PayloadAction<DataPayload<unknown>>) => {
      state.selectedCategories = [
        ...state.selectedCategories,
        action.payload.data,
      ];
    },
    setSearchedCategory: (state, action: PayloadAction<DataPayload<Id>>) => {
      state.searchedCategory = action.payload.data;
    },
    setListingSource: (state, action: PayloadAction<DataPayload<ProductFilterState["listing_source"]>>) => {
      state.listing_source = action.payload.data;
    },
    setCategorySlug: (state, action: PayloadAction<DataPayload<string>>) => {
      state.category_slug = action.payload.data;
    },
    setCategoryBreadcrumb: (state, action: PayloadAction<DataPayload<ProductFilterState["categoryBreadcrumb"]>>) => {
      state.categoryBreadcrumb = action.payload.data;
    },
  },
});

export const {
  setFilterSearch,
  setFilterBrands,
  setFilterCategory,
  setFilterMinMaxPrice,
  setFilterSection,
  setFilterSort,
  setFilterView,
  setFilterProductSizes,
  setFilterByCountry,
  setFilterBySeller,
  clearAllFilter,
  setProductBySearch,
  setSelectedCategories,
  setSearchedCategory,
  setListingSource,
  setCategorySlug,
  setCategoryBreadcrumb,
} = productFilterReducer.actions;

export default productFilterReducer.reducer;
