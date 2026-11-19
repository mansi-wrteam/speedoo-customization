/**
 * What redux-persist already has on disk, read SYNCHRONOUSLY.
 *
 * `applySsrSeed` runs in a `useState` initialiser, before the first render and
 * long before redux-persist has rehydrated (it reads storage asynchronously and
 * buffers actions until it is done). So at seeding time the store still holds
 * `initialState` and there is no way to ask Redux what this visitor chose last
 * time. localStorage, however, is synchronous — this reads it directly.
 *
 * It exists to answer one question: **is the server's value the same as the one
 * this visitor already has?** See the comment in applySsrSeed for why that
 * decides whether seeding is safe.
 */

/** Only the three values a visitor can choose. Everything else is API data. */
export interface PersistedChoice {
  activeModuleId: string | number | null;
  /** "lat,lng" — enough to compare, never used as data. */
  cityKey: string | null;
  langCode: string | null;
}

const parseSlice = (root: Record<string, string>, key: string) => {
  try {
    return root[key] ? JSON.parse(root[key]) : null;
  } catch {
    return null;
  }
};

export const readPersistedChoice = (): PersistedChoice | null => {
  if (typeof window === "undefined") return null;
  try {
    // "persist:root" matches `key: 'root'` in src/redux/store.ts. Each slice is
    // itself a JSON string, which is how redux-persist stores them.
    const raw = window.localStorage.getItem("persist:root");
    if (!raw) return null;
    const root = JSON.parse(raw) as Record<string, string>;

    const moduleSlice = parseSlice(root, "Module");
    const citySlice = parseSlice(root, "City");
    const languageSlice = parseSlice(root, "Language");
    const city = citySlice?.city;

    return {
      activeModuleId: moduleSlice?.activeModuleId ?? null,
      cityKey: city?.latitude != null && city?.longitude != null
        ? `${city.latitude},${city.longitude}`
        : null,
      langCode: languageSlice?.selectedLanguage?.code ?? null,
    };
  } catch {
    // Private mode, blocked storage, corrupt JSON. Treat as "nothing stored",
    // which makes seeding go ahead — the same path a first-time visitor takes.
    return null;
  }
};
