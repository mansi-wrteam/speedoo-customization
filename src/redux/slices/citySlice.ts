import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { City } from "@/types/models/city";
import type { CityState, DataPayload } from "@/types/state";
const initialState: CityState = {
    status: "loading",
    city: null,
};
export const locationReducer = createSlice({
    name: "city",
    initialState,
    reducers: {
        setCity: (state, action: PayloadAction<DataPayload<City | null>>) => {
            state.status = "fulfill";
            state.city = action.payload.data;
        }
    }
});

export const { setCity } = locationReducer.actions;
export default locationReducer.reducer;
