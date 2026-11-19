// `/api/theme` payload, applied by utils/applyTheme.js and stored whole in
// Redux `Theme.moduleThemes`.

import type { Flag, Id } from "../common";

export type ColorStep =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | "950";

/** One shade family. applyTheme uses it only when every step is a valid colour string. */
export type ColorScale = Record<ColorStep, string>;

/** Family keys in the API payload (`warn` maps to the `--color-warning-*` CSS vars). */
export type ThemeFamily = "primary" | "neutral" | "success" | "error" | "warn" | "info";

export interface ModuleTheme {
  module_id?: Id;
  /** Truthy on the default module's entry; it supplies families other modules omit. */
  module_is_default?: Flag;
  /** Colour the primary scale was generated from; fallback for `primary["500"]`. */
  seed_primary?: string;
  primary?: ColorScale;
  neutral?: ColorScale;
  success?: ColorScale;
  error?: ColorScale;
  warn?: ColorScale;
  info?: ColorScale;
}

/** `data` of `api.getTheme()`: keyed by module id. */
export type ThemePayload = Record<string, ModuleTheme>;
