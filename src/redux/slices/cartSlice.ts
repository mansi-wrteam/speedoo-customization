// import { ActionTypes } from "../action-type";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Numeric } from "@/types/common";
import type { AppliedPromoCode, CartData, CartLine, GuestCartLine, StoredCart } from "@/types/models/cart";
import type { CartState, DataPayload } from "@/types/state";

const initialState: CartState = {
  status: "loading",
  cart: null,
  checkout: null,
  promo_code: null,
  cartProducts: [],
  cartSubTotal: 0,
  guestCart: [],
  isGuest: true,
  guestCartTotal: 0,
  self_pickup_mode: 0,
  doorstep_delivery_mode: 0,
};

export const cartReducer = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCart: (state, action: PayloadAction<DataPayload<StoredCart>>) => {
      state.status = "fulfill";
      state.cart = action.payload.data;
    },
    setCartCheckout: (state, action: PayloadAction<DataPayload<CartData | null>>) => {
      state.status = "fulfill";
      state.checkout = action.payload.data;
    },
    setCartPromo: (state, action: PayloadAction<DataPayload<AppliedPromoCode | null>>) => {
      state.status = "fulfill";
      state.promo_code = action.payload.data;
    },
    clearCartPromo: (state) => {
      // state.cart.promo_code = [];
      state.promo_code = null;
    },
    setCartProducts: (state, action: PayloadAction<DataPayload<CartLine[]>>) => {
      state.cartProducts = action.payload.data;
    },
    setCartSubTotal: (state, action: PayloadAction<DataPayload<Numeric | undefined>>) => {
      state.cartSubTotal = action.payload.data;
    },
    setIsGuest: (state, action: PayloadAction<DataPayload<boolean>>) => {
      state.isGuest = action.payload.data;
    },
    addtoGuestCart: (state, action: PayloadAction<DataPayload<GuestCartLine[]>>) => {
      state.guestCart = action.payload.data;
    },
    setGuestCartTotal: (state, action: PayloadAction<DataPayload<Numeric>>) => {
      state.guestCartTotal = action.payload.data;
    },
    // guestCartTotal is typed Numeric because a string payload concatenates
    // (MIGRATION_PLAN bug #30); the arithmetic itself is unchanged.
    // Prices can arrive as numeric strings (and old persisted totals may be
    // strings), so both sides are added as numbers; the total never goes below 0.
    addGuestCartTotal: (state, action: PayloadAction<DataPayload<Numeric>>) => {
      state.guestCartTotal = Number(state.guestCartTotal) + Number(action.payload.data);
    },
    subGuestCartTotal: (state, action: PayloadAction<DataPayload<Numeric>>) => {
      state.guestCartTotal = Math.max(0, Number(state.guestCartTotal) - Number(action.payload.data));
    },
    setSelfPickupMode: (state, action: PayloadAction<DataPayload<Numeric | undefined>>) => {
      state.self_pickup_mode = action.payload.data;
    },
    setDoorStepDeliveryMode: (state, action: PayloadAction<DataPayload<Numeric | undefined>>) => {
      state.doorstep_delivery_mode = action.payload.data;
    },
  },
});

export const {
  setCart,
  setCartCheckout,
  setCartPromo,
  clearCartPromo,
  setCartProducts,
  setCartSubTotal,
  setIsGuest,
  addtoGuestCart,
  setGuestCartTotal,
  addGuestCartTotal,
  subGuestCartTotal,
  setSelfPickupMode,
  setDoorStepDeliveryMode,
} = cartReducer.actions;
export default cartReducer.reducer;
