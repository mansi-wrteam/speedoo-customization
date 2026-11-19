// How non-hook code reaches the Redux store. See SSR_PLAN.md §3.2.
//
// `t()` (1060 call sites), the currency formatter in `lib/utils`, the axios
// interceptors and two other callers all read the store outside React, so they
// can't use `useSelector`. Until now they imported the module singleton
// directly, which is correct in a browser — one tab, one user — and wrong on a
// server, where a single shared store means request A's language, city or token
// can end up in request B's HTML.
//
// They now call `getActiveStore()` instead:
//
//   * In the browser it returns that same singleton. Nothing changes.
//   * On a server it asks the resolver that `src/server/*` installs, which hands
//     back the store built for the request being rendered.
//
// The resolver is injected rather than imported because it needs
// `node:async_hooks`, which must never reach the client bundle. While no
// resolver is installed — the whole of phases 1 and 2, and every static export
// build forever — `getActiveStore()` falls back to the singleton, so behaviour
// is exactly what it was before this file existed.
import { store as clientStore } from "./store";
import type { AppStore } from "./store";

/** Returns the store for the request currently being rendered, if there is one. */
export type ServerStoreResolver = () => AppStore | undefined;

let resolveServerStore: ServerStoreResolver | null = null;

/**
 * Server-only. Installs the per-request lookup; `null` removes it.
 * Called once from `src/server/*`, never from a component.
 */
export const setServerStoreResolver = (resolver: ServerStoreResolver | null) => {
    resolveServerStore = resolver;
};

export const getActiveStore = (): AppStore => {
    if (typeof window !== "undefined") return clientStore;
    return resolveServerStore?.() ?? clientStore;
};
