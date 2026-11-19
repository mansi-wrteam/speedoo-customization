// EGROCER_SERVER_ONLY
//
// Works out what this particular request is asking for. See SSR_PLAN.md §3.4.
//
// Phase 3b adds settings, theme, modules and the city on top of the language.
// Those are what Layout, Header, Footer and `AboutUs` actually read, so they are
// what a server-rendered page needs. Each is TTL-cached, because none of them
// depends on who is asking.
//
// The resolution order copies Layout's client-side logic exactly
// (src/components/layout/Layout.tsx:186-191), because the server and the client
// have to agree on the answer or the page hydrates into a different language
// than it was rendered in:
//
//   ?lang= matched against the language list → is_default == 1 → code "en" → first
//
// `ssrData` implements SSR_PLAN.md decision 2: only the DEFAULT language renders
// its body on the server. A request for any other language gets exactly today's
// behaviour — SEO head server-rendered in that language, body rendered in the
// browser. That removes the cross-request language risk instead of testing it
// away, and a visitor on a non-default language sees nothing worse than today.
import axios from "axios";
import { cached } from "./cache";
import { serverGet } from "./http";
import { assertServerOnly } from "./assertServerOnly";
import { moduleIdFromSlug } from "@/utils/moduleSlug";
import type { ApiResponse, Base64JsonResponse } from "@/types/api";
import type { Id } from "@/types/common";
import type { SsrSeed } from "@/types/ssr";
import type {
  AppSettings,
  City,
  Language,
  LanguageListItem,
  Module,
  ThemePayload,
} from "@/types/models";

assertServerOnly("server/context");

const LANGUAGES_ENDPOINT = "system_languages";
const SETTINGS_ENDPOINT = "settings";
const PAYMENT_SETTINGS_ENDPOINT = "settings/payment_methods";
const MODULES_ENDPOINT = "modules";
const CITY_ENDPOINT = "city";

/**
 * `?module=` slug, then the legacy `?module_id=`, then the `eg_module` cookie,
 * then the first module. The cookie step is what lets the server render the
 * module the visitor last switched to: their real choice lives in
 * redux-persist, which the server cannot see.
 *
 * `pinned` says whether the answer came from the request or is just the
 * fallback. The client uses it to decide whether to trust the seed — see
 * SsrSeed.modulePinned.
 */
const resolveModuleId = (
  modules: Module[],
  slug: string | undefined,
  legacyId: string | undefined,
  cookieId: string | null,
): { id: Id | null; pinned: boolean } => {
  const bySlug = slug ? moduleIdFromSlug(modules, slug) : null;
  if (bySlug != null) return { id: bySlug, pinned: true };
  if (legacyId != null && modules.some((m) => String(m?.id) === String(legacyId))) {
    return { id: Number(legacyId), pinned: true };
  }
  if (cookieId != null && modules.some((m) => String(m?.id) === String(cookieId))) {
    return { id: Number(cookieId), pinned: true };
  }
  return { id: modules[0]?.id ?? null, pinned: false };
};

export interface RequestContext {
  /** Raw `?lang` value, forwarded as `Content-Language` exactly as before. */
  lang: string | string[] | undefined;
  /** The resolved language, with its `json_data` so `t()` works on the server. */
  language: Language | null;
  availableLanguages: LanguageListItem[] | null;
  /** `<html lang>`. */
  langCode: string;
  /** `<html dir>`. */
  dir: "ltr" | "rtl";
  /** False when the body must not be server-rendered for this request. */
  ssrData: boolean;
  settings: AppSettings | null;
  /** Drives the footer's accepted-payment icons on every page. */
  paymentSettings: Record<string, unknown> | null;
  theme: ThemePayload | null;
  modules: Module[];
  activeModuleId: Id | null;
  /** See SsrSeed.modulePinned — false means this is only the default. */
  modulePinned: boolean;
  /**
   * The city whose prices and stock this render uses. From the `eg_city` cookie
   * when the visitor has chosen one, else `settings.default_city` — which is the
   * same city the client would have picked (Header.tsx:221-243), so a first-time
   * visitor sees no change.
   */
  city: City | null;
  /** See SsrSeed.cityPinned. */
  cityPinned: boolean;
  /** True when `?lang=` or the `eg_lang` cookie chose the language. */
  languagePinned: boolean;
}

/** The full language list. Identical for every visitor, so it is cached. */
const fetchLanguageList = () =>
  cached("languages", async () => {
    const body = await serverGet<ApiResponse<LanguageListItem[]>>(LANGUAGES_ENDPOINT, {
      params: { id: 0, is_default: 0, system_type: 3 },
    });
    return body.status == 1 && Array.isArray(body.data) ? body.data : [];
  });

/** One language with its translation payload. Cached per id. */
const fetchLanguage = (id: LanguageListItem["id"]) =>
  cached(`language:${id}`, async () => {
    const body = await serverGet<ApiResponse<Language>>(LANGUAGES_ENDPOINT, {
      params: { id, is_default: 1, system_type: 3 },
    });
    return body.status == 1 ? (body.data as Language) : null;
  });

/**
 * Settings. The API returns base64-encoded JSON — the client does
 * `JSON.parse(atob(res.data))` in Layout, and so do we, so both sides see the
 * identical object.
 */
const fetchSettings = () =>
  cached("settings", async () => {
    const body = await serverGet<Base64JsonResponse>(SETTINGS_ENDPOINT, {
      params: { is_web_setting: 1 },
    });
    if (!body?.data) return null;
    return JSON.parse(Buffer.from(body.data, "base64").toString("utf8")) as AppSettings;
  });

/**
 * The theme payload. Note the different base path: getTheme calls
 * `${API_URL}/api/theme`, not the customer sub-URL, so this cannot go through
 * `serverGet`.
 */
/**
  * Payment settings, base64 like `settings`.
  *
  * Shell data, not checkout data: the FOOTER renders the accepted-payment icons
  * from it on every page. It used to be fetched only in the browser and then
  * persisted, which made the footer render differently on a RELOAD than on a
  * first visit — the server had no payment settings, the rehydrated client did,
  * and React threw away the server HTML on every route. Fetching it here keeps
  * both sides identical, and a crawler sees the footer too.
  */
const fetchPaymentSettings = () =>
  cached("payment-settings", async () => {
    const body = await serverGet<Base64JsonResponse>(PAYMENT_SETTINGS_ENDPOINT);
    if (!body?.data) return null;
    return JSON.parse(Buffer.from(body.data, "base64").toString("utf8")) as Record<string, unknown>;
  });

const fetchTheme = () =>
  cached("theme", async () => {
    const response = await axios.get<ApiResponse<ThemePayload>>(
      `${process.env.NEXT_PUBLIC_API_URL}/api/theme`,
    );
    return response.data?.status == 1 ? response.data.data : null;
  });

const fetchModules = () =>
  cached("modules", async () => {
    const body = await serverGet<ApiResponse<Module[]>>(MODULES_ENDPOINT);
    return body.status == 1 && Array.isArray(body.data) ? body.data : [];
  });

/**
 * The city for a lat/lng. Cached per coordinate pair: the answer depends only on
 * the coordinates, never on the visitor.
 */
const fetchCity = (latitude: string, longitude: string) =>
  cached(`city:${latitude},${longitude}`, async () => {
    const body = await serverGet<ApiResponse<City>>(CITY_ENDPOINT, {
      params: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
    });
    return body.status === 1 ? (body.data as City) : null;
  });

/** Mirrors Layout's fallback chain. */
const pickLanguage = (list: LanguageListItem[], requested: string | undefined) =>
  (requested ? list.find((l) => l.code === requested) : undefined) ||
  list.find((l) => l.is_default == 1) ||
  list.find((l) => l.code === "en") ||
  list[0];

/**
 * The visitor's own city if they have chosen one, else the store's default.
 *
 * The cookie holds only the coordinates, never a whole City object: the
 * authoritative record comes from the API, so a stale or tampered cookie cannot
 * put wrong prices on the page.
 */
const resolveCity = async (
  cookieCity: { latitude: string; longitude: string } | null,
  settings: AppSettings | null,
) => {
  const coords = cookieCity ?? settings?.default_city ?? null;
  if (!coords?.latitude || !coords?.longitude) return null;
  try {
    return await fetchCity(String(coords.latitude), String(coords.longitude));
  } catch (error) {
    console.log("server/context: city lookup failed", error);
    return null;
  }
};

/** What the request's own cookies told us, already validated by withSsr. */
export interface RequestCookies {
  city?: { latitude: string; longitude: string } | null;
  moduleId?: string | null;
  /** Language code from `eg_lang`. Used only when `?lang` is absent. */
  lang?: string | null;
}

export interface ResolveOptions {
  /**
   * Fetch the shell payloads (settings, theme, modules, city) as well as the
   * language. Only a page that server-renders its body seeds them into the
   * store, so for every other page they would be four upstream calls whose
   * result is thrown away. The language is always resolved, because <html lang>
   * and the decision-2 check need it.
   */
  withShell?: boolean;
}

export const resolveRequestContext = async (
  query: Record<string, string | string[] | undefined>,
  cookies: RequestCookies = {},
  { withShell = false }: ResolveOptions = {},
): Promise<RequestContext> => {
  const { city: cookieCity = null, moduleId: cookieModuleId = null, lang: cookieLang = null } = cookies;
  const lang = query.lang;
  // `?lang` is explicit and wins. The cookie is the visitor's standing choice,
  // consulted only when the URL says nothing — a bookmark or a typed address.
  const requested = (Array.isArray(lang) ? lang[0] : lang) || cookieLang || undefined;

  const fallback: RequestContext = {
    lang,
    language: null,
    availableLanguages: null,
    langCode: "en",
    dir: "ltr",
    // With no language list there is no way to know whether this request is for
    // the default language, so the body is not server-rendered.
    ssrData: false,
    settings: null,
    paymentSettings: null,
    theme: null,
    modules: [],
    activeModuleId: null,
    modulePinned: false,
    city: null,
    cityPinned: false,
    languagePinned: false,
  };

  try {
    const list = await fetchLanguageList();
    if (!list.length) return fallback;

    const chosen = pickLanguage(list, requested);
    if (!chosen) return fallback;

    const language = await fetchLanguage(chosen.id);
    const defaultLanguage = list.find((l) => l.is_default == 1) || list[0];
    const isDefault = String(chosen.id) === String(defaultLanguage?.id);

    // Fetched together: four independent calls, all TTL-cached, so a warm cache
    // costs nothing and a cold one costs one round trip rather than four.
    // `allSettled` so one failing payload degrades that slice to client-fetch
    // instead of taking the whole page down (SSR_PLAN.md §3.3).
    const [settingsR, themeR, modulesR, paymentR] = withShell
      ? await Promise.allSettled([
          fetchSettings(),
          fetchTheme(),
          fetchModules(),
          fetchPaymentSettings(),
        ])
      : [];
    const settings = settingsR?.status === "fulfilled" ? settingsR.value : null;
    const paymentSettings = paymentR?.status === "fulfilled" ? paymentR.value : null;
    const theme = themeR?.status === "fulfilled" ? themeR.value : null;
    const modules = modulesR?.status === "fulfilled" ? modulesR.value : [];

    const moduleSlug = Array.isArray(query.module) ? query.module[0] : query.module;
    const legacyModuleId = Array.isArray(query.module_id)
      ? query.module_id[0]
      : query.module_id;

    const city = withShell ? await resolveCity(cookieCity, settings) : null;
    const activeModule = resolveModuleId(modules, moduleSlug, legacyModuleId, cookieModuleId);

    return {
      lang,
      language,
      availableLanguages: list,
      langCode: language?.code || chosen.code || "en",
      dir: (language?.type || chosen.type)?.toUpperCase() === "RTL" ? "rtl" : "ltr",
      ssrData: isDefault,
      settings,
      paymentSettings,
      theme,
      modules,
      activeModuleId: activeModule.id,
      modulePinned: activeModule.pinned,
      city,
      // A city only counts as the visitor's own when it came from their cookie;
      // settings.default_city is the fallback every visitor would get.
      cityPinned: cookieCity != null && city != null,
      // Pinned only when the request asked for this language AND got it; a
      // request for an unknown code falls back, which is not the visitor's
      // choice and must not be seeded over one they already have.
      languagePinned: Boolean(requested) && (language?.code ?? chosen.code) === requested,
    };
  } catch (error) {
    // A language lookup failure must not take the page down: fall back to
    // today's behaviour, which is a client-rendered body.
    console.log("server/context: language resolution failed", error);
    return fallback;
  }
};

/**
 * The serializable slice of the context that travels to the browser in
 * __NEXT_DATA__ and seeds the client store on its first render (SSR_PLAN.md
 * §3.5). Server and client dispatch these through the SAME existing actions, so
 * neither has to reimplement a reducer and both end up in identical state.
 *
 * Shell data only — never anything user-specific. No token, cart, wishlist or
 * address: public pages render as a guest and the signed-in view appears after
 * hydration, exactly as today (constraint 5).
 *
 * Seeding by dispatch rather than by `preloadedState` on purpose: a preloaded
 * slice REPLACES that slice wholesale, so every field of it would have to be
 * restated here — including `settingsFetchedTime`, whose value differs between
 * the server and the browser. Dispatching leaves untouched fields at each
 * side's own initialState.
 */
export type { SsrSeed };

export const seedFor = (context: RequestContext): SsrSeed => ({
  language: context.language,
  availableLanguages: context.availableLanguages,
  settings: context.settings,
  paymentSettings: context.paymentSettings,
  theme: context.theme,
  modules: context.modules,
  activeModuleId: context.activeModuleId,
  modulePinned: context.modulePinned,
  city: context.city,
  cityPinned: context.cityPinned,
  languagePinned: context.languagePinned,
});
