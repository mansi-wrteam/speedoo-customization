import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UiState } from "@/types/state";

// Transient UI state only — this slice is excluded from redux-persist
// (`blacklist: ["Ui"]` in store.ts). Persisting it would reopen the cart
// drawer on every refresh.
const initialState: UiState = {
  cartDrawerOpen: false,
  locationModalOpen: false,
  appBannerOpen: false,
  displayedModuleId: null,
};

export const uiReducer = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Cart and checkout live in the drawer, so several places need to open it:
    // the header icon, the floating cart bar, and the /cart and /checkout
    // routes that shared links land on.
    openCartDrawer: (state) => {
      state.cartDrawerOpen = true;
    },
    closeCartDrawer: (state) => {
      state.cartDrawerOpen = false;
    },
    setCartDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.cartDrawerOpen = action.payload;
    },
    // Home asks for a location when it has none, so the picker is no longer
    // the header's alone (WEB_PARITY_V4.0.2 §8).
    setLocationModalOpen: (state, action: PayloadAction<boolean>) => {
      state.locationModalOpen = action.payload;
    },
    // The app banner asks first; the location picker opens once it's answered.
    setAppBannerOpen: (state, action: PayloadAction<boolean>) => {
      state.appBannerOpen = action.payload;
    },
    setDisplayedModuleId: (state, action: PayloadAction<UiState["displayedModuleId"]>) => {
      state.displayedModuleId = action.payload;
    },
  },
});

export const {
  setDisplayedModuleId,
  openCartDrawer,
  closeCartDrawer,
  setCartDrawerOpen,
  setLocationModalOpen,
  setAppBannerOpen,
} = uiReducer.actions;

export default uiReducer.reducer;
