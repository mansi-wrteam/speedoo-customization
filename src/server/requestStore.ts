// EGROCER_SERVER_ONLY
//
// Gives each request its own Redux store, and makes `getActiveStore()` find the
// right one while that request renders. This is the mechanism SSR_PLAN.md §3.2
// describes, and it closes the risk recorded there.
//
// The problem it solves: `t()` (1060 call sites), the currency formatter, the
// axios interceptors and two other callers read the store from OUTSIDE React, so
// they cannot use `useSelector`. On a server they must still see the store
// belonging to the request currently being rendered.
//
// How the store is scoped — better than the fallback the plan recorded:
//
//   `_document.getInitialProps` is handed `ctx.renderPage`, and the entire React
//   render happens inside it. Replacing it with a wrapper that calls
//   `als.run(store, originalRenderPage)` puts the whole render inside an
//   AsyncLocalStorage scope. Nothing depends on `enterWith` propagating out of
//   getServerSideProps, nothing depends on the render never suspending, and
//   `output: "standalone"` is untouched — so the custom-server fallback in
//   SSR_PLAN.md §3.2 is not needed.
//
//   Next's docs discourage customising `renderPage` (it is aimed at CSS-in-JS
//   and nudges toward the App Router). It is accepted here because it is the
//   only supported hook that wraps the render itself, and a custom server —
//   which is the textbook alternative — cannot be combined with standalone
//   output.
//
// getServerSideProps runs BEFORE the document renders, so it gets the scope too:
// `withSsr` runs its own body inside `als.run` and leaves the store on `req` for
// `_document` to pick up.
import { AsyncLocalStorage } from "node:async_hooks";
import { makeStore, type AppStore, type PreloadedAppState } from "@/redux/store";
import { setServerStoreResolver } from "@/redux/storeAccess";
import { assertServerOnly } from "./assertServerOnly";
import type { IncomingMessage } from "node:http";

assertServerOnly("server/requestStore");

const als = new AsyncLocalStorage<AppStore>();

// Installed once, when this module is first imported — which only ever happens
// from getServerSideProps or _document. Until then `getActiveStore()` keeps
// returning the module singleton, which is what the static export needs.
setServerStoreResolver(() => als.getStore());

/** Where the per-request store and context are parked for `_document` to find. */
const REQ_KEY = "__egrocerSsr";

export interface RequestScope<TContext = unknown> {
  store: AppStore;
  context: TContext;
}

type ScopedRequest = IncomingMessage & { [REQ_KEY]?: RequestScope };

/** Builds the store for one request. Never persisted — see SSR_PLAN.md §3.2. */
export const createRequestStore = (preloadedState?: PreloadedAppState) =>
  makeStore(preloadedState);

/** Runs `fn` with `store` as the active store for everything it awaits. */
export const runWithRequestStore = <T>(store: AppStore, fn: () => T): T =>
  als.run(store, fn);

/** Parks the scope on the request so `_document` can re-enter it. */
export const attachRequestScope = <TContext>(
  req: IncomingMessage | undefined,
  scope: RequestScope<TContext>,
) => {
  if (req) (req as ScopedRequest)[REQ_KEY] = scope as RequestScope;
};

/** Reads back what `attachRequestScope` parked, if this request had any. */
export const readRequestScope = <TContext>(
  req: IncomingMessage | undefined,
): RequestScope<TContext> | undefined =>
  req ? ((req as ScopedRequest)[REQ_KEY] as RequestScope<TContext> | undefined) : undefined;
