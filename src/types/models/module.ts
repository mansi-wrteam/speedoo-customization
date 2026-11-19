// Store module (grocery, pharmacy, food…) — items of `api.getModules()` `data`,
// stored in Redux `Module.modules`.

import type { Id, Url } from "../common";

export interface Module {
  /** Sent as the X-Module-Id header; `Module.activeModuleId` holds one of these. */
  id: Id;
  /** Used in the URL (`?module=grocery`). */
  slug?: string;
  name?: string;
  image_url?: Url;
  /** Localised name; preferred over `name` when present. */
  translations?: { name?: string };
}
