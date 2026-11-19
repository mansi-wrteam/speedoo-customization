import { createContext, useContext, type ReactNode } from "react";

/**
 * Data a server-rendered page already fetched, keyed by a name the component
 * agrees on. See SSR_PLAN.md §3.5, channel 3.
 *
 * Why a third channel. Some pages fetch with React Query, which has
 * `dehydrate`/`HydrationBoundary` for exactly this. Others — FAQs, Blogs,
 * BlogDetail — fetch in a `useEffect` and keep the result in `useState`. For
 * those there is nothing to hydrate into, so the server's result is handed down
 * through context and used as the `useState` initial value, with the mount effect
 * skipped when it is present.
 *
 * Converting those pages to React Query would be tidier and is deliberately NOT
 * done here: it would change when and how often they refetch, and this plan's
 * rule is that behaviour stays put.
 */
export type ServerDataMap = Record<string, unknown>;

const ServerDataContext = createContext<ServerDataMap | null>(null);

export const ServerDataProvider = ({
  value,
  children,
}: {
  value: ServerDataMap | null | undefined;
  children: ReactNode;
}) => <ServerDataContext.Provider value={value ?? null}>{children}</ServerDataContext.Provider>;

/**
 * The server's value for `key`, or undefined when this render has none — which
 * is every render in the static export, every non-default-language request
 * (SSR_PLAN.md decision 2), and every client-side navigation after the first.
 *
 * Callers must treat undefined as "fetch it yourself", so a page keeps working
 * exactly as it does today whenever the server did not provide anything.
 */
export const useServerData = <T,>(key: string): T | undefined => {
  const map = useContext(ServerDataContext);
  return map ? (map[key] as T | undefined) : undefined;
};
