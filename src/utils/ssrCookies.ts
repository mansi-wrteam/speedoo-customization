/**
 * Cookies that let the SERVER render what this visitor actually chose.
 *
 * The server has no access to redux-persist — that lives in localStorage, which
 * is never sent with a request. So without these, every server render uses the
 * store's defaults: the default city and the first module. The visitor then
 * loads, the browser restores their real choice, and the page visibly re-renders
 * with different products.
 *
 * Writing them is what removes that flash: the request carries the choice, the
 * server renders it correctly first time.
 *
 * Deliberately NOT httpOnly — the browser both writes and reads them. They hold
 * no secrets: a city's coordinates and a module id, both already visible in the
 * URL and the UI. `SameSite=Lax` so they ride normal navigations but not
 * cross-site POSTs.
 */

/** Must match CITY_COOKIE / MODULE_COOKIE in src/server. */
export const CITY_COOKIE = "eg_city";
export const MODULE_COOKIE = "eg_module";
export const LANG_COOKIE = "eg_lang";

const ONE_YEAR = 60 * 60 * 24 * 365;

const write = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
  } catch {
    // Cookies disabled: the server keeps using its defaults, which is simply
    // today's behaviour. Never worth throwing for.
  }
};

/** Coordinates only — the server re-looks-up the city, so a stale or edited
 *  cookie cannot put wrong prices on the page. */
export const writeCityCookie = (city: { latitude?: unknown; longitude?: unknown } | null | undefined) => {
  if (!city?.latitude || !city?.longitude) return;
  write(CITY_COOKIE, JSON.stringify({ latitude: String(city.latitude), longitude: String(city.longitude) }));
};

/** The module the visitor switched to. */
export const writeModuleCookie = (moduleId: string | number | null | undefined) => {
  if (moduleId == null) return;
  write(MODULE_COOKIE, String(moduleId));
};

/**
 * The language the visitor switched to, as its code ("ar").
 *
 * Without it a cold load of a URL carrying no `?lang` — a bookmark, a typed
 * address, a shared link — server-renders the DEFAULT language and seeds it into
 * the browser, overwriting the visitor's choice in redux-persist. Static export
 * keeps the choice, so this is the one place SSR used to behave worse.
 */
export const writeLangCookie = (code: string | null | undefined) => {
  if (!code || !/^[a-zA-Z-]{2,10}$/.test(code)) return;
  write(LANG_COOKIE, code);
};
