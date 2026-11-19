// EGROCER_SERVER_ONLY
//
// The HTTP client every server-side fetch goes through. See SSR_PLAN.md §3.3.
//
// Deliberately NOT src/api/axiosMiddleware: that instance attaches the JWT from
// the Redux store and sets `Content-Type: multipart/form-data`. On a server,
// public pages render as a guest (SSR_PLAN.md constraint 5), so no token may be
// sent — and in phase 1 the store it reads is still the shared singleton.
//
// Every request carries a hard timeout (SSR_PLAN.md §8). Without one, a single
// slow upstream call holds the Node event loop's request open until the client
// gives up, and under load that is how one slow endpoint takes the whole site
// down. On timeout the loader's `safe()` swallows the error, the page ships its
// shell, and the browser fetches — today's behaviour, which is why a timeout is
// safe to add only now that the degrade path exists.
import axios from "axios";
import { assertServerOnly } from "./assertServerOnly";

assertServerOnly("server/http");

/** Absolute URL for an API path, matching how the pages built theirs. */
/** Per-request upstream timeout. `SSR_API_TIMEOUT_MS`, default 4000. */
const timeoutMs = () => {
  const raw = Number(process.env.SSR_API_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 4000;
};

export const apiUrl = (endpoint: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}${process.env.NEXT_PUBLIC_API_SUBURL}/${endpoint}`;

export interface ServerGetOptions {
  /** Query string parameters. */
  params?: Record<string, unknown>;
  /** The request language, forwarded as `Content-Language` exactly as before. */
  lang?: string | string[];
  /**
   * The active module, sent as `X-Module-Id`.
   *
   * The client adds this to catalogue calls through `moduleHeader()` in
   * apiRoutes, which reads the active module out of the store. The server has to
   * send the same header or the API answers for a different module than the
   * browser would have asked about, and the page hydrates into different data.
   */
  moduleId?: string | number | null;
}

/**
 * GET an API endpoint from the server.
 *
 * Throws on a failed request, like the raw `axios.get` it replaces — each
 * caller's own try/catch decides what a failure means for that page, and those
 * decisions differ (notFound for a blog, default meta for a product).
 */
export const serverGet = async <T>(endpoint: string, options: ServerGetOptions = {}) => {
  const response = await axios.get<T>(apiUrl(endpoint), {
    timeout: timeoutMs(),
    params: options.params,
    headers: {
      "Content-Language": options.lang,
      // Omitted entirely when there is no module, matching `moduleHeader()`,
      // which returns {} rather than a null header.
      ...(options.moduleId != null ? { "X-Module-Id": options.moduleId } : null),
    },
  });
  return response.data;
};

/**
 * POST an API endpoint from the server, as multipart FormData.
 *
 * The catalogue endpoints are POSTs whose body `apiRoutes.getProductByFilter`
 * builds field by field, skipping null, undefined, "" and empty arrays — because
 * FormData would otherwise send an empty array as the string "". The same rule is
 * reproduced here so the server's request body matches the browser's byte for
 * byte; a stray empty field changes what the API returns.
 */
export const serverPostForm = async <T>(
  endpoint: string,
  fields: Record<string, unknown>,
  options: ServerGetOptions = {},
) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value === null || value === undefined || value === "" || isEmptyArray) continue;
    form.append(key, String(value));
  }
  const response = await axios.post<T>(apiUrl(endpoint), form, {
    timeout: timeoutMs(),
    headers: {
      "Content-Language": options.lang,
      ...(options.moduleId != null ? { "X-Module-Id": options.moduleId } : null),
    },
  });
  return response.data;
};
