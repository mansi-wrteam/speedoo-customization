// Drop-in replacements for next/link and next/router that preserve the
// `lang` and `module` (slug) query params across navigations, so
// getServerSideProps receives the correct language and the active module
// travels with every link (shareable across modules, readable slug URLs).
import NextLink from "next/link";
import { useRouter as useNextRouter, type NextRouter } from "next/router";
import type { ComponentProps } from "react";
import type { UrlObject } from "url";
import { useSelector } from "react-redux";
import type { RootState } from "@/types/state";
import { slugFromModuleId } from "./moduleSlug";

/** A link target: path string or Next.js URL object. */
type Href = string | UrlObject;
type QueryValue = string | string[] | undefined;
type PushArgs = Parameters<NextRouter["push"]>;

const useLang = (): QueryValue => {
  const router = useNextRouter();
  const reduxLang = useSelector((s: RootState) => s.Language?.selectedLanguage?.code);
  return router.query.lang || reduxLang;
};

// The URL carries the module SLUG (?module=grocery). Prefer the ACTIVE module
// from redux: the Layout reader seeds it from the URL on load, so after that
// redux is the source of truth. Reading the URL first made every navigation
// that happens right after a module switch carry the OLD slug — the page it
// landed on then re-adopted that stale slug and flipped the module back.
// The URL is only the fallback for the first render, before the modules list
// (and therefore the slug lookup) is available.
const useModuleSlug = (): QueryValue => {
  const router = useNextRouter();
  const modules = useSelector((s: RootState) => s.Module?.modules);
  const activeId = useSelector((s: RootState) => s.Module?.activeModuleId);
  return slugFromModuleId(modules, activeId) ?? router.query.module;
};

const addParam = (path: string, key: string, val: unknown) => {
  if (val == null || val === "") return path;
  if (new RegExp(`[?&]${key}=`).test(path)) return path; // already present, keep it
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${val}`;
};

/**
 * Anything that leaves this app: an absolute URL, or a scheme like mailto: and
 * tel:. `?lang` and `?module` are OUR query params and mean nothing to
 * facebook.com — appending them produced real links like
 * `https://www.facebook.com/?lang=en&module=grocery` in the header and footer.
 *
 * It also broke hydration: the server resolves a module and renders the param,
 * the browser's first render may not have one yet, so the two `href`s differ and
 * React discards the server markup for the whole tree.
 */
const isExternal = (path: string) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(path);

const injectParams = <T extends Href | null | undefined>(url: T, lang: QueryValue, moduleSlug: QueryValue): T => {
  if (url == null) return url;
  if (typeof url === "string") {
    if (isExternal(url)) return url;
    let [path, hash] = url.split("#");
    path = addParam(path, "lang", lang);
    path = addParam(path, "module", moduleSlug);
    return `${path}${hash ? `#${hash}` : ""}` as T;
  }
  if (typeof url === "object") {
    return {
      ...url,
      query: {
        ...((url as UrlObject).query as object || {}),
        ...(lang ? { lang } : {}),
        ...(moduleSlug != null ? { module: moduleSlug } : {}),
      },
    } as T;
  }
  return url;
};

export const LocalizedLink = ({ href, ...props }: ComponentProps<typeof NextLink>) => {
  const lang = useLang();
  const moduleSlug = useModuleSlug();
  return <NextLink href={injectParams(href, lang, moduleSlug)} {...props} />;
};

export const useLocalizedRouter = () => {
  const router = useNextRouter();
  const lang = useLang();
  const moduleSlug = useModuleSlug();
  return {
    ...router,
    push: (url: PushArgs[0], as?: PushArgs[1], options?: PushArgs[2]) =>
      router.push(injectParams(url, lang, moduleSlug), as, options),
    replace: (url: PushArgs[0], as?: PushArgs[1], options?: PushArgs[2]) =>
      router.replace(injectParams(url, lang, moduleSlug), as, options),
  };
};