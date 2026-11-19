import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Id } from "@/types/common";
import type { Module } from "@/types/models/module";
import type { DataPayload, ModuleState } from "@/types/state";

const initialState: ModuleState = {
    modules: [],
    activeModuleId: null,
};

export const moduleReducer = createSlice({
    name: "module",
    initialState,
    reducers: {
        setModules: (state, action: PayloadAction<DataPayload<Module[]>>) => {
            state.modules = action.payload.data;
        },
        setActiveModule: (state, action: PayloadAction<DataPayload<Id | null>>) => {
            state.activeModuleId = action.payload.data;
        },
    },
});

export const { setModules, setActiveModule } = moduleReducer.actions;
export default moduleReducer.reducer;
