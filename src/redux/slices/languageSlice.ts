import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Language, LanguageListItem } from "@/types/models/language";
import type { DataPayload, LanguageState } from "@/types/state";

const initialState: LanguageState = {
    selectedLanguage: null,
    availableLanguages: null
}

export const languageReducer = createSlice({
    name: "language",
    initialState,
    reducers: {
        setSelectedLanguage: (state, action: PayloadAction<DataPayload<Language | null | undefined>>) => {
            state.selectedLanguage = action.payload.data
        },
        setAvailableLanguages: (state, action: PayloadAction<DataPayload<LanguageListItem[] | null>>) => {
            state.availableLanguages = action.payload.data
        }
    }
})

export const { setAvailableLanguages, setSelectedLanguage } = languageReducer.actions
export default languageReducer.reducer
