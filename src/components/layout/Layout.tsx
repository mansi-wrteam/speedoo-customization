import React, { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { setPaymentSetting, setRealtimeSetting, setSetting } from "@/redux/slices/settingSlice";
import { useEffect, useLayoutEffect, useRef } from "react";
import { applyTheme } from "@/utils/applyTheme";
import { useSelector, useDispatch } from "react-redux";
import * as api from "@/api/apiRoutes";
import { ToastContainer } from "react-toastify";
import Loader from "../loader/Loader";
import { setFavoriteProductIds } from "@/redux/slices/FavoriteSlice";
import PushNotification from "../firebasenotification/PushNotification";
import MobileBottomSheet from "../mobile-bottom-sheet/MobileBottomSheet";
import LangFile from "@/utils/en.json";
import {
  setAvailableLanguages,
  setSelectedLanguage,
} from "@/redux/slices/languageSlice";
import { useRouter } from "next/router";
import Head from "next/head";
import { appScheme, iosAppId } from "@/utils/appLink";
import MaintanceMode from "../error/MaintanceMode";
import { setLocalTheme, setModuleThemes } from "@/redux/slices/themeSlice";
import { useTheme } from "next-themes";
import { setActiveModule } from "@/redux/slices/moduleSlice";
import { moduleIdFromSlug, slugFromModuleId } from "@/utils/moduleSlug";
import { usePrescriptionImageHydration } from "@/utils/usePrescriptionImageHydration";
import { useSsrCookieSync } from "@/utils/useSsrCookieSync";
import { useSsrMediaQuery } from "@/utils/useSsrMediaQuery";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id } from "@/types/common";
import type { AppSettings, Language, LanguageListItem, ThemePayload } from "@/types/models";

// useLayoutEffect warns during SSR; on the server there is nothing to paint.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;



const MODULE_REDIRECT_ROUTES = [
  "/categories",
  "/category",
  "/product/",
  "/products",
  "/brands",
  "/sellers",
  "/countries",
  "/cart",
  "/checkout",
  "/order-detail",
  "/profile/orderhistory",
  "/profile/activeorders",
];

export interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector((state: RootState) => state.Theme.theme);
  const setting = useSelector((state: RootState) => state.Setting);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const activeModuleId = useSelector((state: RootState) => state.Module.activeModuleId);
  const displayedModuleId = useSelector((state: RootState) => state.Ui.displayedModuleId);
  const themeModuleId = displayedModuleId ?? activeModuleId;
  const modules = useSelector((state: RootState) => state.Module.modules);
  const appStoreId = appScheme(setting?.setting) ? iosAppId(setting?.setting?.appstore_url) : null;
  // redux-persist's REHYDRATE hard-sets each persisted slice, Module included.
  // If it lands after the URL's module was applied, the last-used module wins
  // over a `?module=` link. So the URL reader/writer wait for it.
  const rehydrated = useSelector((state: RootState) => state._persist?.rehydrated);
 
  // "Open in app" banner on every page, phones only. False on the server and
  // first client render, so the banner (which reads `navigator`) never SSRs.
  const isMobileScreen = useSsrMediaQuery({ query: "(max-width: 765px)" });

  const didInitModuleFromUrl = useRef(false);
  const moduleWriterRan = useRef(false);

  // Rebuild uploaded prescription images from IndexedDB after a refresh.
  usePrescriptionImageHydration();

  // Mirror the visitor's module and city into cookies so the SERVER can render
  // their choice instead of the defaults. See useSsrCookieSync.
  useSsrCookieSync();

  
  useEffect(() => {
    if (!router.isReady || !rehydrated || didInitModuleFromUrl.current) return;
    if (!modules?.length) return; // enabled-modules list not loaded yet — wait

    didInitModuleFromUrl.current = true;

    const isEnabled = (id: Id | string[] | null | undefined) =>
      id != null && modules.some((m) => String(m?.id) === String(id));

    const urlSlug = router.query.module;
    const legacyId = router.query.module_id;

    let targetId: Id | null | undefined = null;
    if (urlSlug != null) targetId = moduleIdFromSlug(modules, urlSlug); // valid slug only
    else if (isEnabled(legacyId)) targetId = Number(legacyId);

    if (targetId == null) {
      targetId = isEnabled(activeModuleId) ? activeModuleId : modules[0].id;
    }

    if (String(targetId) !== String(activeModuleId)) {
      dispatch(setActiveModule({ data: targetId }));
    }
  }, [router.isReady, rehydrated, router.query.module, router.query.module_id, activeModuleId, modules]);


  useEffect(() => {
    if (!router.isReady || activeModuleId == null) return;
    // Until the reader has adopted the URL, activeModuleId may still be the
    // persisted module, and writing it would overwrite the link's `?module=`.
    if (!didInitModuleFromUrl.current) return;
    const activeSlug = slugFromModuleId(modules, activeModuleId);
    if (!activeSlug) return; // modules not loaded yet — can't write the slug
    const hasLegacyId = router.query.module_id != null;
    // On the first run, if the URL already carries a module slug, let the reader
    // adopt it — unless there's also a legacy module_id we still need to strip.
    if (!moduleWriterRan.current) {
      moduleWriterRan.current = true;
      if (router.query.module != null && !hasLegacyId) return;
    }
    
    if (
      MODULE_REDIRECT_ROUTES.some((route) => router.pathname.startsWith(route))
    )
      return;
    if (router.query.module === activeSlug && !hasLegacyId) return;
    const nextQuery: typeof router.query = { ...router.query, module: activeSlug };
    delete nextQuery.module_id; // drop the legacy param
    router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true },
    );
  }, [router.isReady, rehydrated, activeModuleId, modules, router.query.module_id]);

  
  useEffect(() => {
    if (!modules?.length || activeModuleId == null) return;
    const stillEnabled = modules.some(
      (m) => String(m?.id) === String(activeModuleId)
    );
    if (!stillEnabled) {
      dispatch(setActiveModule({ data: modules[0].id }));
    }
  }, [modules, activeModuleId]);

  const availableLanguages = useSelector(
    (state: RootState) => state.Language.availableLanguages,
  );

  const [loading, setLoading] = useState(false);
  // const [showLocation, setShowLocation] = useState(false)

  useEffect(() => {
    if (!language?.type) return;
    document.documentElement.dir = language.type.toLowerCase();
    document.documentElement.lang = language.code || "en";
  }, [language?.type, language?.code]);

  useEffect(() => {
    fetchTheme();
    fetchSetting();
    fetchPaymentSetting();
    if (!availableLanguages?.length) {
      fetchLanguage();
    }
  }, []);

  
  // next-themes (the `dark` class on <html>) and Redux's Theme.theme are
  // persisted separately, and only the Header toggle wrote both. If Redux was
  // reset on a device while next-themes kept "dark", components reading Redux
  // painted light-theme colours (e.g. section backgrounds) on a dark page.
  // The class is what the visitor sees, so Redux follows it.
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme && resolvedTheme !== theme) {
      dispatch(setLocalTheme({ data: resolvedTheme }));
    }
  }, [resolvedTheme, theme, dispatch]);

  // The theme follows the module whose content is on screen. Home holds it on
  // the old module while a switch loads, then commits content + theme in one
  // update; elsewhere it is simply the active module. Layout effect, so the new
  // colours land in the same paint as the new content.
  useIsomorphicLayoutEffect(() => {
    themeModuleIdRef.current = themeModuleId;
    applyModuleTheme();
  }, [themeModuleId]);

  useEffect(() => {
    if (!router.isReady || !availableLanguages?.length) return;

    const queryLang = router.query.lang;

    // If no lang in URL → do nothing (your other effect handles it)
    if (!queryLang) return;

    const targetLang = availableLanguages.find((l) => l.code === queryLang);

    // ✅ If valid language → existing behavior (unchanged)
    if (targetLang) {
      if (targetLang.code === language?.code) return;

      api
        .getSystemLanguages({
          id: targetLang.id,
          isDefault: 0,
          systemType: 3,
        })
        .then((res) => {
          if (res.status == 1 && (res.data as Language)?.code !== language?.code) {
            dispatch(setSelectedLanguage({ data: res.data as Language }));
          }
        })
        .catch((err) => console.log("lang sync error", err));

      return;
    }

    // ✅ ✅ FALLBACK LOGIC (NO API CALL)
    const fallbackLang =
      availableLanguages.find((l) => l.is_default == 1) ||
      availableLanguages.find((l) => l.code === "en") ||
      availableLanguages[0];

    if (!fallbackLang) return;

    // If already same → just fix URL
    if (fallbackLang.code === language?.code) {
      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, lang: fallbackLang.code },
        },
        undefined,
        { shallow: true },
      );
      return;
    }

    // ✅ Set fallback WITHOUT API
    dispatch(setSelectedLanguage({ data: fallbackLang }));

    // ✅ Fix URL
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, lang: fallbackLang.code },
      },
      undefined,
      { shallow: true },
    );
  }, [router.query.lang, router.isReady, availableLanguages]);

  const fetchLanguage = async () => {
    try {
      const response = await api.getSystemLanguages({
        id: 0,
        isDefault: 0,
        systemType: 3,
      });
      if (response.status == 1) {
        if (response.data !== undefined) {
          if ((response?.data as LanguageListItem[])?.length == 1) {
            try {
              const langRes = await api.getSystemLanguages({
                id: (response?.data as LanguageListItem[])?.[0]?.id,
                isDefault: 1,
                systemType: 3,
              });
              if (langRes.status == 1) {
                dispatch(setSelectedLanguage({ data: langRes?.data as Language }));
              } else {
                const language: Language = {
                  id: 15,
                  name: "English",
                  code: "en",
                  type: "LTR",
                  system_type: 3,
                  is_default: 1,
                  json_data: LangFile,
                  display_name: "English",
                  system_type_name: "Website",
                };
                dispatch(setSelectedLanguage({ data: language }));
              }
            } catch (error) {
              console.log("error");
            }
          } else if (language == null) {
            const langId = (response?.data as LanguageListItem[])?.find(
              (lang) => lang?.is_default == 1,
            )?.id;
            const langRes = await api.getSystemLanguages({
              id: langId,
              isDefault: 1,
              systemType: 3,
            });
            dispatch(setSelectedLanguage({ data: langRes?.data as Language }));
          }
          dispatch(setAvailableLanguages({ data: response.data as LanguageListItem[] }));
        } else {
          const language: Language = {
            id: 15,
            name: "English",
            code: "en",
            type: "LTR",
            system_type: 3,
            is_default: 1,
            json_data: LangFile,
            display_name: "English",
            system_type_name: "Website",
          };
          dispatch(setSelectedLanguage({ data: language }));
        }
      }
    } catch (error) {
      console.log("Error", error);
    }
  };
  useEffect(() => {
    if (!router.isReady) return;

    if (router.query?.lang === language?.code) return;

    // If language exists but URL doesn't have it → add it
    if (language?.code && !router.query?.lang) {
      router.replace({
        pathname: router.pathname,
        query: { ...router.query, lang: language?.code },
      });
    }
  }, [language, router.isReady]);

  // Raw /api/theme payload (module id -> theme entry), cached so switching
  // modules re-applies colours locally instead of re-fetching.
  const themeDataRef = useRef<ThemePayload | null>(null);
  // fetchTheme runs once from the mount effect, so applyModuleTheme there is the
  // first render's closure. If the module changed before /theme answered (the
  // persisted module replaced by `?module=`), it painted the OLD module's
  // colours and nothing re-applied them. Read the module from a ref instead.
  const themeModuleIdRef = useRef(themeModuleId);

  // Pulls the Kigen shade scales from the theme API and writes them onto the
  // `--color-*` primitives. Every semantic token derives from those, so this
  // re-themes light and dark mode in one shot. On failure the static Figma
  // values in globals.css remain in effect.
  const fetchTheme = async () => {
    try {
      const res = await api.getTheme();
      // Anything other than a success response leaves the local Figma shades
      // in globals.css untouched. applyTheme applies the same rule per family:
      // an incomplete or malformed scale falls back rather than half-applying.
      if (res?.status != 1) return;

      themeDataRef.current = res?.data;
      // Header tints each module pill with that module's own primary.
      dispatch(setModuleThemes({ data: res?.data }));
      applyModuleTheme();
    } catch (error) {
      // Network/parse failure — local shades stay in effect.
      console.log("theme error, using local shades", error);
    }
  };

  // Re-applies the cached theme payload for whichever module is active, so
  // each module's own primary/neutral shades show up when the user switches.
  const applyModuleTheme = () => {
    if (!themeDataRef.current) return;
    const { applied, fellBack } = applyTheme(themeDataRef.current, themeModuleIdRef.current);
    if (fellBack.length) {
      console.log(
        `theme: using local shades for ${fellBack.join(", ")}` +
          (applied.length ? ` (from API: ${applied.join(", ")})` : ""),
      );
    }
  };

  const fetchSetting = async () => {
    setLoading(true);
    try {
      const res = await api.getSetting();
      const setting: AppSettings = JSON.parse(atob(res.data));
      dispatch(setSetting({ data: setting }));
      // `realtime` is a sibling of `data`, not inside the base64 payload
      // (trap 6) — decoding `data` and looking for it there finds nothing.
      dispatch(setRealtimeSetting({ data: res?.realtime ?? null }));
      dispatch(setFavoriteProductIds({ data: setting?.favorite_product_ids }));
      // NOTE: the API's brand colour (web_settings.color) is intentionally NOT
      // applied — the palette comes from the Kigen design tokens in globals.css.
      // Re-enable only once the backend serves a full Kigen primary scale.
      if (setting?.favicon) {
        const link =
          document.querySelector<HTMLLinkElement>("link[rel*='icon']") ||
          document.createElement("link");
        const oldLinks = document.querySelectorAll("link[rel*='icon']");
        oldLinks.forEach((el) => el.parentNode!.removeChild(el));
        link.type = "image/x-icon";
        link.rel = "shortcut icon";
        link.href = setting.favicon;
        link.sizes = "16x16 32x32 64x64";
        document.getElementsByTagName("head")[0].appendChild(link);
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log("error", error);
    }
  };

  // The full-screen loader waits for the settings (fetchSetting) only;
  // payment settings are needed later, at checkout.
  const fetchPaymentSetting = async () => {
    try {
      const res = await api.getPaymentSetting();
      dispatch(setPaymentSetting({ data: JSON.parse(atob(res.data)) }));
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    // Show loader on route change start — but not for shallow updates. The
    // module switcher (and the module/lang URL writers) only rewrite the query
    // with { shallow: true }; treating that as a navigation swapped the whole
    // page, header included, for a full-screen loader and remounted it all —
    // the "blink" on every module switch.
    const handleStart = (_url: string, { shallow }: { shallow: boolean }) => {
      if (!shallow) setLoading(true);
    };
    const handleComplete = () => setLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    // Cleanup event listeners
    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  return (
    // Full-height column so the footer sits at the bottom of the screen on
    // short pages instead of leaving bare background below it.
    <section className="flex min-h-screen flex-col">
      {/* Safari's own "Open in app" banner (DEEPLINK_SPEC.md §3.2). Safari checks
          whether the app is installed itself, so iOS gets no "address is
          invalid" alert. Same switch as MobileBottomSheet: only when enabled. */}
      {appStoreId && (
        <Head>
          <meta
            key="apple-itunes-app"
            name="apple-itunes-app"
            content={`app-id=${appStoreId}, app-argument=${process.env.NEXT_PUBLIC_BASE_URL}${router.asPath.split("#")[0]}`}
          />
        </Head>
      )}
      {loading ? (
        <Loader screen="full" />
      ) : setting?.setting?.web_settings?.website_mode == 1 ? (
        <MaintanceMode
          message={setting?.setting?.web_settings?.website_mode_remark}
        />
      ) : (
        <PushNotification>
          <Header />
          {/* Takes the leftover height; pages lay out inside it as before. */}
          <div className="flex-1">{children}</div>
          <Footer />
          {isMobileScreen && <MobileBottomSheet />}
          <ToastContainer
            theme={theme}
            key="toastContainer"
            bodyClassName={"toast-body"}
            toastClassName="toast-container-className"
          />
        </PushNotification>
      )}
      {/* <Location showLocation={showLocation} setShowLocation={setShowLocation} /> */}
    </section>
  );
};

export default Layout;