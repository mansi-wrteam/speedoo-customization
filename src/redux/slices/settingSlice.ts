import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppSettings, PaymentSettings, RealtimeSettings } from "@/types/models/settings";
import type { DataPayload, SettingState } from "@/types/state";
const initialState: SettingState = {
    status: 'loading',
    setting: null,
    payment_setting: null,
    realtime: null,
    // ISO strings, not Date objects: Redux state stays plain data (#25).
    settingsFetchedTime: new Date().toISOString(),
    paymentSettingsFetchTime: new Date().toISOString(),
    isPopupSeen: false
};
export const settingReducer = createSlice({
    name: "setting",
    initialState,
    reducers: {
        setSetting: (state, action: PayloadAction<DataPayload<AppSettings | null>>) => {
            state.status = "fulfill";
            state.setting = action.payload.data;
            state.settingsFetchedTime = new Date().toISOString();
        },
        setPaymentSetting: (state, action: PayloadAction<DataPayload<PaymentSettings | null>>) => {
            state.status = "fulfill";
            state.payment_setting = action.payload.data;
            state.paymentSettingsFetchTime = new Date().toISOString();
        },
        /** Stored separately because it arrives beside `data`, not inside it (§3.1). */
        setRealtimeSetting: (state, action: PayloadAction<DataPayload<RealtimeSettings | null>>) => {
            state.realtime = action.payload.data;
        },
        setIsPopupSeen: (state, action: PayloadAction<DataPayload<boolean>>) => {
            state.isPopupSeen = action.payload.data;
        }
    }
});
export const { setSetting, setPaymentSetting, setRealtimeSetting, setIsPopupSeen } = settingReducer.actions;
export default settingReducer.reducer;
