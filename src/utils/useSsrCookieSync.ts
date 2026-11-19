import { useEffect } from "react";
import { useSelector } from "react-redux";
import { writeCityCookie, writeLangCookie, writeModuleCookie } from "./ssrCookies";
import type { RootState } from "@/types/state";

/**
 * Keeps the `eg_module` / `eg_city` cookies in step with the store.
 *
 * The explicit writes at the two places the visitor chooses (Header's module
 * switcher, the location modal) cover someone choosing now. This covers someone
 * who chose BEFORE these cookies existed, or in another tab: their choice is in
 * redux-persist, which the server cannot read, so without this their first
 * request after a deploy server-renders the first module and the default city.
 *
 * That matters beyond a wrong first paint. The server's value is seeded into the
 * browser store to make hydration agree, and seeding a value the visitor did not
 * pick would overwrite — and, because persist writes on every change, erase —
 * the one they did. `applySsrSeed` therefore refuses to seed an unpinned module
 * or city, and this hook is what gets the request pinned, from the next
 * navigation onwards.
 *
 * Runs after rehydration, so the values it writes are the visitor's own.
 */
export const useSsrCookieSync = () => {
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const modules = useSelector((state: RootState) => state.Module.modules);
  const city = useSelector((state: RootState) => state.City?.city);
  const langCode = useSelector((state: RootState) => state.Language?.selectedLanguage?.code);

  useEffect(() => {
    // Only a module that is still enabled: writing an id the API no longer
    // returns would have the server fall back anyway, and the cookie would then
    // outlive the module for a year.
    if (activeModuleId == null || !modules?.length) return;
    if (!modules.some((m) => String(m?.id) === String(activeModuleId))) return;
    writeModuleCookie(activeModuleId);
  }, [activeModuleId, modules]);

  useEffect(() => {
    writeCityCookie(city);
  }, [city?.latitude, city?.longitude]);

  useEffect(() => {
    writeLangCookie(langCode);
  }, [langCode]);
};
