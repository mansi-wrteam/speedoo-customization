import enTranslation from "./en.json"
import { getActiveStore } from "@/redux/storeAccess";

// U+FFFD in a server string means the character didn't survive storage — a
// 4-byte emoji dropped into a 3-byte `utf8` column comes back as one of these
// per emoji. The bundled copy is intact, so prefer it over the damaged text.
const isDamaged = (value: unknown) =>
    typeof value === "string" && value.includes("�");

/**
 * Translate a key using the selected language's `json_data`, falling back to
 * the bundled English file. Typed as `string`; an unknown key returns
 * undefined at runtime, as it always has.
 */
export const t = (label: string): string => {
    const store = getActiveStore();
    const langData = store.getState().Language?.selectedLanguage?.json_data && store.getState().Language?.selectedLanguage?.json_data![label];
    if (langData && !(isDamaged(langData) && (enTranslation as Record<string, string>)[label])) {
        return langData;
    } else {
        return (enTranslation as Record<string, string>)[label];
    }
};
