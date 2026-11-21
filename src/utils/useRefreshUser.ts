import { useCallback } from "react";
import { useDispatch } from "react-redux";
import * as api from "@/api/apiRoutes";
import { setCurrentUser } from "@/redux/slices/userSlice";
import type { AppDispatch } from "@/redux/hooks";

/** Reloads the signed-in user, which refreshes the wallet balance held in redux. */
export const useRefreshUser = () => {
  const dispatch = useDispatch<AppDispatch>();
  return useCallback(async () => {
    try {
      const response = await api.getUser();
      if (response?.user) dispatch(setCurrentUser({ data: response.user }));
    } catch (error) {
      console.log("Error", error);
    }
  }, [dispatch]);
};
