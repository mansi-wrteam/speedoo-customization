import axios from "axios";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getActiveStore } from "@/redux/storeAccess";
import { logoutAuth } from "@/redux/slices/userSlice";
import { clearCartPromo, setCart, setCartProducts, setCartSubTotal, setIsGuest } from "@/redux/slices/cartSlice";

const access_key_param = "x-access-key";
const access_key = "903361";

const url = process.env.NEXT_PUBLIC_API_URL;
const subUrl = process.env.NEXT_PUBLIC_API_SUBURL;
const api = axios.create({
  baseURL: `${url}${subUrl}/`,
});

const getStoredToken = async () => {
  const state = getActiveStore().getState();
  return state?.User?.jwtToken;
};

const getStoredLanguage = async () => {
  const state = getActiveStore().getState();
  return state?.Language?.selectedLanguage;
};

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const authToken = await getStoredToken();
      const language = await getStoredLanguage();
      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
      }
      config.headers["Content-Type"] = "multipart/form-data";
      config.headers["x-access-key"] = access_key;
      config.headers["Content-Language"] = language?.code;
      return config;
    } catch (error) {
      console.error("Error in token retrival", error);
      return Promise.reject(error);
    }
  },
  (error: unknown) => {
    console.error("Error in inceptor", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    try {
      return response;
    } catch (error) {
      console.error("Error while fetching data", error);
      return Promise.reject(error);
    }
  },
  (error: AxiosError) => {
    if(error?.response?.status === 401){
      // Session expired (or a token from another API server). Reset the cart
      // the way LogoutModal does: clearing only the token left `isGuest` false,
      // so every load read the member cart with no token and got 401 again.
      const { dispatch } = getActiveStore();
      dispatch(logoutAuth());
      dispatch(setIsGuest({ data: true }));
      dispatch(setCart({ data: [] }));
      dispatch(setCartProducts({ data: [] }));
      dispatch(setCartSubTotal({ data: 0 }));
      dispatch(clearCartPromo());
      // Handled here, so not an error: console.error also raised Next's dev overlay.
      console.warn("Session expired (401), signed out", error?.config?.url);
      return Promise.reject(error);
    }
    console.error("Error while fetching data", error);
    return Promise.reject(error);
  }
);

export default api;
