import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Address } from "@/types/models/address";
import type { AddressState, DataPayload } from "@/types/state";

const initialState: AddressState = {
    selectedEditAddress: [],
    allAddresses: [],
    selectedAddress: []
}

export const addressReducer = createSlice({
    name: "address",
    initialState,
    reducers: {
        setSelectedAddresForEdit: (state, action: PayloadAction<DataPayload<Address | null>>) => {
            state.selectedEditAddress = action.payload.data
        },
        setAllAddresses: (state, action: PayloadAction<DataPayload<Address[]>>) => {
            state.allAddresses = action.payload.data
        },
        setSelectedAddress: (state, action: PayloadAction<DataPayload<Address>>) => {

            state.selectedAddress = action.payload.data
        }
    }
})

export const { setAllAddresses, setSelectedAddresForEdit, setSelectedAddress } = addressReducer.actions

export default addressReducer.reducer
