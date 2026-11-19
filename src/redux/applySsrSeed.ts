// Applies the server-resolved shell state to a store. See SSR_PLAN.md §3.5.
//
// Runs on BOTH sides, through the same existing actions:
//
//   * on the server, against the per-request store, before the tree renders;
//   * in the browser, against the one client store, before the first render.
//
// That is what makes the server HTML and the client's first render agree. If
// only the server seeded, React 19 would find a different tree on hydration,
// throw the server markup away for that subtree, and silently undo the SSR.
//
// It dispatches the app's own actions rather than handing Redux a
// `preloadedState`, because a preloaded slice replaces that slice wholesale —
// every field would have to be restated, including ones like
// `settingsFetchedTime` whose value legitimately differs between server and
// browser. Dispatching leaves untouched fields at each side's own initialState.
//
// This file is NOT under src/server: the client imports it too.
import { setCity } from "./slices/citySlice";
import { readPersistedChoice } from "./persistedChoice";
import { setAvailableLanguages, setSelectedLanguage } from "./slices/languageSlice";
import { setActiveModule, setModules } from "./slices/moduleSlice";
import { setPaymentSetting, setSetting } from "./slices/settingSlice";
import { setShop } from "./slices/shopSlice";
import { setModuleThemes } from "./slices/themeSlice";
import type { AppStore } from "./store";
import type { SsrSeed } from "@/types/ssr";

export type { SsrSeed };

export const applySsrSeed = (store: AppStore, seed: SsrSeed | null | undefined) => {
  if (!seed) return;

  // Each guard mirrors the condition the client code already used before
  // dispatching the same action, so seeding can never write a state the app
  // would not have reached on its own.
  // ── The three values a visitor can CHOOSE ────────────────────────────────
  //
  // Module, city and language are the only seeded values the visitor controls,
  // and `persistConfig` has no whitelist, so all three are persisted. That makes
  // seeding them a real decision rather than a copy:
  //
  //   * Seed a value the visitor did NOT choose and redux-persist, which writes
  //     on every change, erases the one they did — permanently.
  //   * Skip seeding a value the server DID render and the browser's first
  //     render disagrees with the server markup, which is a hydration mismatch:
  //     React throws the server HTML away and re-renders the whole tree on the
  //     client, undoing the SSR completely.
  //
  // Both failure modes have happened. The cookies (`eg_module`, `eg_city`,
  // `eg_lang`) are what normally makes the question moot — the server resolves
  // the visitor's own value, so seeding it is both correct and matching. These
  // checks cover the one case the cookies cannot: a visitor who chose BEFORE the
  // cookies existed, whose choice is in localStorage and nowhere else.
  //
  // So: seed unless the server's value is a fallback AND this browser already
  // holds a different one. That is a single request per such visitor —
  // `useSsrCookieSync` writes the cookie on it, and every request after is
  // pinned, seeded and matching.
  const isServer = typeof window === "undefined";
  // The per-request server store has nothing to protect and must take the
  // server's value, or the markup renders with no module, city or language.
  const stored = isServer ? null : readPersistedChoice();
  const conflicts = (pinned: boolean | undefined, mine: unknown, theirs: unknown) =>
    !isServer && !pinned && mine != null && String(mine) !== String(theirs);

  if (seed.language && !conflicts(seed.languagePinned, stored?.langCode, seed.language.code)) {
    store.dispatch(setSelectedLanguage({ data: seed.language }));
  }
  if (seed.availableLanguages?.length) {
    store.dispatch(setAvailableLanguages({ data: seed.availableLanguages }));
  }
  if (seed.settings) store.dispatch(setSetting({ data: seed.settings }));
  // Not a visitor choice — identical for everyone, so it is seeded unconditionally.
  if (seed.paymentSettings) store.dispatch(setPaymentSetting({ data: seed.paymentSettings }));
  if (seed.theme) store.dispatch(setModuleThemes({ data: seed.theme }));
  if (seed.modules?.length) store.dispatch(setModules({ data: seed.modules }));
  const moduleApplied =
    seed.activeModuleId != null &&
    !conflicts(seed.modulePinned, stored?.activeModuleId, seed.activeModuleId);
  if (moduleApplied) {
    store.dispatch(setActiveModule({ data: seed.activeModuleId }));
  }
  if (
    seed.city &&
    !conflicts(seed.cityPinned, stored?.cityKey, `${seed.city.latitude},${seed.city.longitude}`)
  ) {
    store.dispatch(setCity({ data: seed.city }));
  }
  // Page data rather than shell data; see the note on SsrSeed.shop.
  // The shop belongs to the server's module: when the visitor's stored module
  // won above, these sections would show one module under another's chip.
  if (seed.shop && (isServer || moduleApplied)) store.dispatch(setShop({ data: seed.shop }));
};
