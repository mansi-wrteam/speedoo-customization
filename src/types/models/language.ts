// Website languages. `api.getSystemLanguages({ id: 0 })` returns the list
// (Redux `Language.availableLanguages`); calling it with a language id returns
// that language with its translation strings (Redux `Language.selectedLanguage`).
// A list item can also be stored as the selected language (Layout.jsx fallback),
// so everything past the list fields is optional.

import type { Flag, Id } from "../common";

/** Text direction; compared with `== "RTL"` and lower-cased for `<html dir>`. */
export type LanguageDirection = "LTR" | "RTL";

export interface LanguageListItem {
  id: Id;
  name?: string;
  /** Locale code used in the `?lang=` query, e.g. `"en"`. */
  code?: string;
  type?: LanguageDirection;
  /** `1` for the admin's default language. */
  is_default?: Flag;
}

export interface Language extends LanguageListItem {
  display_name?: string;
  /** Translation strings keyed by label; read by `t()` (utils/translation.js). */
  json_data?: Record<string, string>;
  /** `3` = website. */
  system_type?: number;
  system_type_name?: string;
  /** Language id to register the FCM token under (`updateFcmToken`). */
  admin_lang_id_for_fcm?: Id;
}
