
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Id } from "@/types/common";
import type { AuthType, User } from "@/types/models/user";
import type { DataPayload, UserState } from "@/types/state";


const initialState: UserState = {
    status: "loading",
    user: null,
    fcm_token: "",
    authId: "",
    jwtToken: "",
    authType: ""
};

export const userReducer = createSlice({
    name: "user",
    initialState,
    reducers: {
        setCurrentUser: (state, action: PayloadAction<DataPayload<User | null>>) => {
            state.status = "fulfill";
            state.user = action.payload.data;
        },
        setAuthType: (state, action: PayloadAction<DataPayload<AuthType | string>>) => {
            state.status = "fulfill";
            state.authType = action.payload.data;
        },
        logoutAuth: (state, action: PayloadAction<void>) => {
            state.status = "loading";
            state.user = null;
            state.authId = "";
            state.jwtToken = "";
            state.authType = "";
            // fcm_token is kept: it belongs to the device, is fetched only on
            // page load, and the next login in this tab must send it.
        },
        deductUserBalance: (state, action: PayloadAction<DataPayload<number>>) => {
            if (state.user) {
                // balance is optional in the API model; the reducer assumes it is set.
                (state.user.balance as number) -= action.payload.data;
            }
        },
        addUserBalance: (state, action: PayloadAction<DataPayload<number>>) => {
            if (state.user) {
                (state.user.balance as number) += action.payload.data;
            }
        },
        setFcmToken: (state, action: PayloadAction<DataPayload<string | null>>) => {
            state.fcm_token = action.payload.data;
        },
        setAuthId: (state, action: PayloadAction<DataPayload<Id>>) => {
            state.authId = action.payload.data;
        },
        setJWTToken: (state, action: PayloadAction<DataPayload<string>>) => {
            state.jwtToken = action.payload.data;
        }
    }
});

export const { setCurrentUser, logoutAuth, deductUserBalance, addUserBalance, setFcmToken, setAuthId, setJWTToken, setAuthType } = userReducer.actions;
export default userReducer.reducer;
