// The shape of the server-resolved shell state that travels to the browser.
//
// Lives here, not in `src/server/`, because BOTH sides need the type:
// `src/server/context.ts` produces it and `src/redux/applySsrSeed.ts` consumes
// it on the client. A client file importing from `@/server/*` — even for a type
// that erases at compile time — is refused by scripts/verify-server-only.mjs,
// and rightly so: a type-only import is one edit away from becoming a value
// import that drags the server tree into the browser bundle.
import type { Id } from "./common";
import type { AppSettings, City, Language, LanguageListItem, Module, ShopData, ThemePayload } from "./models";

/**
 * Shell state only — never anything user-specific. No token, cart, wishlist or
 * address: public pages render as a guest and the signed-in view appears after
 * hydration (SSR_PLAN.md constraint 5).
 */
export interface SsrSeed {
  language: Language | null;
  availableLanguages: LanguageListItem[] | null;
  settings: AppSettings | null;
  /** Footer payment icons render from this on every page. */
  paymentSettings?: Record<string, unknown> | null;
  theme: ThemePayload | null;
  modules: Module[];
  activeModuleId: Id | null;
  city: City | null;
  /**
   * True only when `activeModuleId` / `city` came from THIS request — a `?module=`
   * slug or the visitor's cookie — rather than from the store's defaults.
   *
   * The client must know the difference. redux-persist holds the module and city
   * the visitor picked on their last visit, and localStorage is never sent with a
   * request, so a server render with no cookie falls back to the first module and
   * the default city. Seeding that fallback into the browser store OVERWRITES the
   * visitor's real choice — and because persist writes on every change, it also
   * destroys it on disk, which is why the module used to reset to Grocery on
   * refresh. When the flag is false the browser keeps its own value and only the
   * server markup uses the default, which is all it could ever have rendered.
   */
  modulePinned?: boolean;
  cityPinned?: boolean;
  languagePinned?: boolean;
  /**
   * Homepage payload. Unlike the other fields this is PAGE data, not shell data,
   * and it rides here for one reason: the homepage body renders from
   * `state.Shop`, which `Homepage` normally fills in a mount effect. An effect
   * never runs during a server render, so the store has to be seeded directly or
   * the page server-renders empty.
   */
  shop?: ShopData | null;
}
