import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore, createTransform, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, type PersistConfig } from "redux-persist"
import storage from "redux-persist/lib/storage"
import { rootReducer } from './rootReducer';
import { addPrescriptions } from "./slices/checkoutSlice";
import type { CheckoutState, RootState } from "@/types/state";

// A prescription image carries two fields that can't be serialized: the File
// itself (rehydrates as {}) and its object URL (revoked on unload). Persist the
// metadata so the groups survive a refresh, and let the boot-time hydration
// reattach the blob from IndexedDB — see utils/prescriptionImageStore.
// The legacy flat `prescriptions` list has no ids to rehydrate from, so it is
// still dropped entirely.
const stripPrescriptionBlobs = createTransform(
    (inbound: CheckoutState) => ({
        ...inbound,
        prescriptions: [],
        prescriptionGroups: (inbound?.prescriptionGroups || []).map((group) => ({
            ...group,
            images: (group.images || [])
                .filter((img) => img?.imageId)
                .map(({ imageId, name, size, type }) => ({ imageId, name, size, type })),
        })),
    }),
    (outbound) => outbound,
    { whitelist: ["Checkout"] }
);

const persistConfig: PersistConfig<ReturnType<typeof rootReducer>> = {
    key: 'root',
    storage,
    transforms: [stripPrescriptionBlobs],
    // `Ui` is transient (the cart drawer's open flag). Persisted, it would
    // reopen the drawer on every page load.
    // `Shop` is Home's sections for ONE module; persisted, a refresh could put the
    // last module's products under another module's chip. Home refetches it anyway.
    blacklist: ["Ui", "Shop"],
};


const persistedReducer = persistReducer(persistConfig, rootReducer);

type PersistedRootState = ReturnType<typeof persistedReducer>;

/** A server-resolved slice of state handed to `makeStore` (SSR_PLAN.md §3.5). */
export type PreloadedAppState = Partial<PersistedRootState>;

const middlewareOptions = {
    immutableCheck: false as const,
    // Dev-only check that state and actions are plain data. Two exceptions:
    // redux-persist's own actions carry callbacks, and prescription images
    // hold their File and object URL on purpose (the persist transform above
    // strips them; IndexedDB restores them after a reload).
    serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER, addPrescriptions.type],
        ignoredActionPaths: ["payload.images", "payload.byId"],
        ignoredPaths: ["Checkout.prescriptions", "Checkout.prescriptionGroups"],
    },
    // thunk is part of the default middleware.
};

/**
 * Builds a store. The browser builds exactly one (below, persisted); the server
 * will build one per request and never persist it, so one request's language,
 * city or token can't leak into another request's HTML — see SSR_PLAN.md §3.2.
 *
 * Called with no argument it is identical to the store this module has always
 * exported.
 */
export const makeStore = (preloadedState?: PreloadedAppState) =>
    configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware(middlewareOptions),
        // `persistReducer` erases the per-slice preloaded-state typing that
        // `combineReducers` normally gives `configureStore`, so a partial has
        // to be asserted. It is safe at runtime: `combineReducers` fills any
        // missing slice from that slice's own `initialState`.
        preloadedState: preloadedState as PersistedRootState | undefined,
    });

export const store = makeStore();
export type AppStore = typeof store;
export const persistor = persistStore(store);

// ── Compile-time check: src/types/state.ts must describe this store exactly.
// If a slice's state shape changes without updating RootState, this fails to compile.
type StoreState = ReturnType<typeof store.getState>;
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type AssertTrue<T extends true> = T;
export type _RootStateMatchesStore = AssertTrue<Exact<StoreState, RootState>>;
