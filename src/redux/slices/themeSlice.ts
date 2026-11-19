import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ThemePayload } from "@/types/models/theme";
import type { DataPayload, ThemeState } from "@/types/state";


const initialState: ThemeState = {
    status: 'loading',
    theme: "light",
    // Raw /api/theme payload: module id -> that module's palette. Kept whole so
    // a module can be shown in its OWN colour, not the active theme's.
    moduleThemes: null
}

export const themeSlice = createSlice({
    name: "Theme",
    initialState,
    reducers: {
        setLocalTheme: (state, action: PayloadAction<DataPayload<ThemeState["theme"]>>) => {
            state.status = "fulfill";
            state.theme = action.payload.data
        },
        setModuleThemes: (state, action: PayloadAction<DataPayload<ThemePayload | null>>) => {
            state.moduleThemes = action.payload.data
        }
    }
})

export const { setLocalTheme, setModuleThemes } = themeSlice.actions
export default themeSlice.reducer;
