import { useEffect, useState, Suspense } from "react";
import "@/styles/globals.css";
import { Provider, useSelector } from "react-redux";
import { store } from "@/redux/store";
import { applySsrSeed } from "@/redux/applySsrSeed";
import { ServerDataProvider } from "@/utils/useServerData";
import { getActiveStore } from "@/redux/storeAccess";
import "react-toastify/dist/ReactToastify.css";
import Loader from "@/components/loader/Loader";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import type { RootState } from "@/types/state";
import { ThemeProvider } from "next-themes";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Outfit } from 'next/font/google';

// Outfit is the typeface the Kigen design specifies. Loaded through next/font
// so it is self-hosted and preloaded — no render-blocking request to Google.
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-family',
  display: 'swap',
});

const queryClientOptions = {
  defaultOptions: {
    queries: {
      // Don't auto-refetch when the tab regains focus after being idle. The
      // home query writes its result into redux (setShop); a focus-refetch that
      // returns a partial/empty payload could overwrite good data and make the
      // homepage slider disappear until a manual refresh.
      refetchOnWindowFocus: false,
      // A QueryClient is built PER REQUEST on the server, and every query it
      // holds schedules a garbage-collection timer for `gcTime` — five minutes
      // by default. A pending timer keeps its client, its cache and the seeded
      // payload alive, so on the server the default means every request's data
      // is retained for five minutes after the response has been sent.
      //
      // On a page that seeds a product list that is roughly a megabyte, and this
      // was measured: hammering /products grew RSS about 1 MB per request and
      // never gave it back, while /privacy-policy — same per-request store, no
      // large payload — settled after 5,700 requests. With a heap cap the server
      // eventually died with "Reached heap limit"; uncapped it just climbed to
      // 2 GB and took longer to get there.
      //
      // Nothing re-reads a server QueryClient after its render, so there is
      // nothing to keep: 0 lets it go as soon as the render is done. The browser
      // keeps the normal five minutes, which is what makes back-navigation
      // instant.
      gcTime: typeof window === "undefined" ? 0 : 5 * 60 * 1000,
    },
  },
};

interface AppContentProps {
  Component: AppProps["Component"];
  pageProps: AppProps["pageProps"];
}

function AppContent({ Component, pageProps }: AppContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const selectedLanguage = useSelector(
    (state: RootState) => state.Language.selectedLanguage
  );

  useEffect(() => {
    // Shallow query rewrites (module switch, ?lang sync) are not navigations —
    // no full-screen overlay for them.
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
    <>
      {loading && <Loader screen="full" />}
      <Component {...pageProps} />
    </>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  // One QueryClient per App instance rather than one per module. In the browser
  // that is the same thing — App mounts once and is never unmounted, so the
  // cache still survives every route change. On a server it is the difference
  // between a cache per request and a cache shared by every visitor, which is
  // why it has to move before anything is server-rendered (SSR_PLAN.md §3.2).
  const [queryClient] = useState(() => new QueryClient(queryClientOptions));

  // Which store this render uses.
  //
  //   server — `getActiveStore()` returns the store built for THIS request.
  //            _document put the whole render inside that store's
  //            AsyncLocalStorage scope, so the Provider and the non-hook readers
  //            (`t()`, the currency formatter) see one and the same store.
  //   browser — the module singleton, which redux-persist is attached to.
  //
  // The seed is applied in a `useState` initialiser so it lands BEFORE any child
  // renders: the first browser render then matches the server markup exactly.
  // Running it once is enough — App mounts once and is never unmounted. After
  // mount, redux-persist rehydrates and Layout's effects refresh, both of which
  // may legitimately overwrite this, as they do today.
  const [appStore] = useState(() => {
    const resolved = typeof window === "undefined" ? getActiveStore() : store;
    applySsrSeed(resolved, pageProps?.ssrSeed);
    return resolved;
  });

  return (
    <main className={`${outfit.variable} `}>
      {/* next/font scopes its variable to the element carrying `.variable`.
          Radix portals (dialogs, sheets, dropdowns) mount on document.body,
          outside <main>, so publish the family on :root as well or they fall
          back to the browser default. */}
      <style jsx global>{`
        :root {
          --font-family: ${outfit.style.fontFamily};
        }
      `}</style>
      <QueryClientProvider client={queryClient}>
        <Provider store={appStore}>
          <ThemeProvider attribute="class" defaultTheme="light">
            <ServerDataProvider value={pageProps?.serverData}>
              <Suspense fallback={<Loader screen="full" />}>
                <AppContent Component={Component} pageProps={pageProps} />
              </Suspense>
            </ServerDataProvider>
          </ThemeProvider>
        </Provider>
      </QueryClientProvider>
    </main>
  );
}
