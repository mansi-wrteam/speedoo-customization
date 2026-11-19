import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Id } from "@/types/common";
import type { Address } from "@/types/models/address";
import type { OrderType, PaymentMethod, PhonePeInitData, PrescriptionImage } from "@/types/models/checkout";
import type { TimeSlot } from "@/types/models/misc";
import type { CheckoutState, DataPayload } from "@/types/state";

const initialState: CheckoutState = {
  currentStep: 1,
  address: null,
  selectedDate: null,
  timeSlot: null,
  selectedPaymentMethod: null,
  isWalletChecked: false,
  usedWalletBalance: 0,
  orderNote: "",
  checkoutTotal: 0,
  phonepecheckoutdetails: "",
  orderType: "doorstep",
  prescriptions: [], // [{ file, preview }] — legacy flat list (kept for backward compat)
  // Prescription grouping: each group binds selected cart lines to image(s).
  // An image is { imageId, name, size, type } (persisted) plus { file, preview }
  // (runtime-only — rebuilt from IndexedDB by hydratePrescriptionImages).
  prescriptionGroups: [],
  selectedPrescriptionProductIds: [], // variant ids ticked but not yet grouped
  prescriptionGroupSeq: 0, // incrementing id source for groups
};

export const checkoutReducer = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<DataPayload<number>>) => {
      state.currentStep = action.payload.data;
    },
    setAddress: (state, action: PayloadAction<DataPayload<Address | null>>) => {
      state.address = action.payload.data;
    },
    setSelectedDate: (state, action: PayloadAction<DataPayload<string | null>>) => {
      state.selectedDate = action.payload.data;
    },
    setTimeSlot: (state, action: PayloadAction<DataPayload<TimeSlot | null>>) => {
      state.timeSlot = action.payload.data;
    },
    setPaymentMethod: (state, action: PayloadAction<DataPayload<PaymentMethod | null>>) => {
      state.selectedPaymentMethod = action.payload.data;
    },
    setWalletChecked: (state, action: PayloadAction<DataPayload<boolean>>) => {
      state.isWalletChecked = action.payload.data;
    },
    setUserWalletBalance: (state, action: PayloadAction<DataPayload<number>>) => {
      state.usedWalletBalance = action.payload.data;
    },
    setOrderNote: (state, action: PayloadAction<DataPayload<string | undefined>>) => {
      state.orderNote = action.payload.data;
    },
    setCheckoutTotal: (state, action: PayloadAction<DataPayload<number>>) => {
      state.checkoutTotal = action.payload.data;
    },
    setPhonePeCheckoutDetails: (state, action: PayloadAction<"" | PhonePeInitData>) => {
      state.phonepecheckoutdetails = action.payload;
    },
    setOrderType: (state, action: PayloadAction<DataPayload<OrderType>>) => {
      state.orderType = action.payload.data;
    },
    addPrescriptions: (state, action: PayloadAction<DataPayload<CheckoutState["prescriptions"]>>) => {
      // action.payload.data = array of { file, preview }
      state.prescriptions.push(...action.payload.data);
    },
    removePrescription: (state, action: PayloadAction<{ index: number }>) => {
      state.prescriptions.splice(action.payload.index, 1);
    },
    clearPrescriptions: (state) => {
      state.prescriptions = [];
      state.prescriptionGroups = [];
      state.selectedPrescriptionProductIds = [];
      state.prescriptionGroupSeq = 0;
    },
    // ---- Prescription grouping ----
    togglePrescriptionSelection: (state, action: PayloadAction<{ productId: Id }>) => {
      const id = action.payload.productId;
      // Ignore if this line is already part of a group (its checkbox is locked).
      const inGroup = state.prescriptionGroups.some((g) =>
        g.productIds.includes(id)
      );
      if (inGroup) return;
      const idx = state.selectedPrescriptionProductIds.indexOf(id);
      if (idx >= 0) state.selectedPrescriptionProductIds.splice(idx, 1);
      else state.selectedPrescriptionProductIds.push(id);
    },
    selectPrescriptionProducts: (state, action: PayloadAction<{ productIds?: Id[] }>) => {
      const ids = action.payload.productIds || [];
      ids.forEach((id) => {
        const inGroup = state.prescriptionGroups.some((g) =>
          g.productIds.includes(id)
        );
        if (!inGroup && !state.selectedPrescriptionProductIds.includes(id)) {
          state.selectedPrescriptionProductIds.push(id);
        }
      });
    },
    clearPrescriptionSelection: (state) => {
      state.selectedPrescriptionProductIds = [];
    },
    addPrescriptionGroup: (state, action: PayloadAction<{ images?: PrescriptionImage[] }>) => {
      const images = action.payload.images || []; // [{ file, preview }]
      const productIds = [...state.selectedPrescriptionProductIds];
      if (productIds.length === 0 || images.length === 0) return;
      state.prescriptionGroupSeq += 1;
      state.prescriptionGroups.push({
        id: state.prescriptionGroupSeq,
        productIds,
        images,
      });
      state.selectedPrescriptionProductIds = [];
    },
    removePrescriptionGroup: (state, action: PayloadAction<{ id: number }>) => {
      state.prescriptionGroups = state.prescriptionGroups.filter(
        (g) => g.id !== action.payload.id
      );
    },
    addImagesToGroup: (state, action: PayloadAction<{ id: number; images?: PrescriptionImage[] }>) => {
      const g = state.prescriptionGroups.find(
        (x) => x.id === action.payload.id
      );
      if (g) g.images.push(...(action.payload.images || []));
    },
    // Reattach the Blob + a fresh object URL after a reload. Images whose blob
    // is missing from IndexedDB are dropped, and any group left with no image
    // goes with them — a row the user can't submit is worse than none.
    hydratePrescriptionImages: (state, action: PayloadAction<{ byId?: Record<string, { file: File | Blob; preview: string }> }>) => {
      const byId = action.payload.byId || {};
      state.prescriptionGroups.forEach((group) => {
        group.images = (group.images || [])
          .map((img) => {
            if (img.file) return img; // already live in this session
            const hydrated = byId[img.imageId];
            return hydrated ? { ...img, ...hydrated } : null;
          })
          .filter(Boolean) as PrescriptionImage[];
      });
      state.prescriptionGroups = state.prescriptionGroups.filter(
        (g) => g.images.length > 0
      );
    },
    removeImageFromGroup: (state, action: PayloadAction<{ id: number; index: number }>) => {
      const { id, index } = action.payload;
      const g = state.prescriptionGroups.find((x) => x.id === id);
      if (!g) return;
      g.images.splice(index, 1);
      // Drop the whole group if it no longer has any image.
      if (g.images.length === 0) {
        state.prescriptionGroups = state.prescriptionGroups.filter(
          (x) => x.id !== id
        );
      }
    },
    // Called when a product is removed from the cart so it doesn't linger in a group.
    removeProductFromPrescriptions: (state, action: PayloadAction<{ productId: Id }>) => {
      const id = action.payload.productId;
      state.selectedPrescriptionProductIds =
        state.selectedPrescriptionProductIds.filter((x) => x !== id);
      state.prescriptionGroups.forEach((g) => {
        g.productIds = g.productIds.filter((x) => x !== id);
      });
      state.prescriptionGroups = state.prescriptionGroups.filter(
        (g) => g.productIds.length > 0
      );
    },
    // Route-change reset: clears the checkout FLOW (step, address, payment…)
    // but keeps the prescriptions the user uploaded — those belong to the cart,
    // not to a checkout session, and must survive navigating away and back
    // (e.g. switching module, which redirects to home).
    resetCheckoutFlow: (state) => {
      Object.assign(state, {
        currentStep: 1,
        address: null,
        selectedDate: null,
        timeSlot: null,
        selectedPaymentMethod: null,
        isWalletChecked: false,
        usedWalletBalance: 0,
        orderNote: "",
        checkoutTotal: 0,
        orderType: "doorstep",
      });
    },
    clearCheckout: (state) => {
      const phonepecheckoutdetails = state.phonepecheckoutdetails;
      Object.assign(state, {
        currentStep: 1,
        address: null,
        selectedDate: null,
        timeSlot: null,
        selectedPaymentMethod: null,
        isWalletChecked: false,
        usedWalletBalance: 0,
        orderNote: "",
        checkoutTotal: 0,
        orderType: "doorstep",
        prescriptions: [],
        prescriptionGroups: [],
        selectedPrescriptionProductIds: [],
        prescriptionGroupSeq: 0,
        phonepecheckoutdetails, // preserve the existing value
      });
    },
  },
});

export const {
  setAddress,
  setSelectedDate,
  setPaymentMethod,
  setCurrentStep,
  setTimeSlot,
  setWalletChecked,
  setOrderNote,
  clearCheckout,
  setCheckoutTotal,
  setUserWalletBalance,
  setPhonePeCheckoutDetails,
  setOrderType,
  resetCheckoutFlow,
  addPrescriptions,
  removePrescription,
  clearPrescriptions,
  togglePrescriptionSelection,
  selectPrescriptionProducts,
  clearPrescriptionSelection,
  addPrescriptionGroup,
  hydratePrescriptionImages,
  removePrescriptionGroup,
  addImagesToGroup,
  removeImageFromGroup,
  removeProductFromPrescriptions,
} = checkoutReducer.actions;

export default checkoutReducer.reducer;
