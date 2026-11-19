import { setJWTToken } from "../slices/userSlice";
import type { AppDispatch } from "../hooks";

export const setTokenThunk = (token: string) => async (dispatch: AppDispatch) => {

    try {
        await dispatch(setJWTToken({ data: token }));
        return true;
    } catch (error) {
        console.error("Error setting token:", error);
        return false;
    }
}
