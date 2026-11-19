// Typed Redux hooks. Same functions as react-redux's useSelector/useDispatch —
// `withTypes` only attaches the types — so switching a component from
// `useSelector((state) => …)` to `useAppSelector((state) => …)` changes nothing
// at runtime.
//
// Not used yet: components start using these as they are converted (Phase 4).
import { useDispatch, useSelector, useStore } from "react-redux";
import type { Action, ThunkAction } from "@reduxjs/toolkit";
import type { RootState } from "@/types/state";
import type { store } from "./store";

export type { RootState };
export type AppStore = typeof store;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action>;

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppStore = useStore.withTypes<AppStore>();
