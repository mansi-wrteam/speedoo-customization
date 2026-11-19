import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Id } from "@/types/common";
import type { DataPayload, FavoriteState } from "@/types/state";

const initialState: FavoriteState = {
    status: 'loading', //fulfill
    favouriteProductIds: []
};

export const favoriteReducer = createSlice({
    name: "wishlist",
    initialState,
    reducers: {
        setFavoriteProductIds: (state, action: PayloadAction<DataPayload<Id[] | undefined>>) => {
            state.status = "fulfill"
            state.favouriteProductIds = action.payload.data
        }
    }
})

export const { setFavoriteProductIds } = favoriteReducer.actions
export default favoriteReducer.reducer
