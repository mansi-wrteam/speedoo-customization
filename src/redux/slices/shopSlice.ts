import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ShopData } from "@/types/models/catalog";
import type { DataPayload, ShopState } from "@/types/state";

const initialState: ShopState = {
    status: "loading",
    shop: null,
    isRefetch: 0
};

export const shopReducer = createSlice({
    name: "shop",
    initialState,
    reducers: {
        setShop: (state, action: PayloadAction<DataPayload<ShopData | null | undefined>>) => {
            state.status = "fulfill";
            state.shop = action.payload.data;
        },
        // Called with no payload (dispatch(setIsRefetch())).
        setIsRefetch:(state,action: PayloadAction<void>) => {
            state.isRefetch += 1;
        }
    }

});
export const { setShop,setIsRefetch } = shopReducer.actions;
export default shopReducer.reducer;
