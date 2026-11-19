// Which map the shop uses (WEB_PARITY_V4.0.2 §4).
//
// Admin → Store Settings → Map Provider. `"osm"` means OpenStreetMap;
// anything else, including absent, means Google — so a shop that never touched
// the setting keeps the map it has always had.
import type { AppSettings } from "@/types/models/settings";

type Maybe<T> = T | null | undefined;

export type MapProvider = "google" | "osm";

/**
 * The free OSM tile server. It may cut off commercial traffic without notice,
 * so production should set `map_tile_url` to its own — this is only the
 * stand-in until the backend sends one.
 */
export const OSM_DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
/** Whatever replaces it must still credit OSM. */
export const OSM_DEFAULT_ATTRIBUTION = "© OpenStreetMap contributors";

export const getMapProvider = (setting: Maybe<AppSettings>): MapProvider =>
  String(setting?.map_provider ?? "").trim().toLowerCase() === "osm" ? "osm" : "google";

export interface TileConfig {
  url: string;
  attribution: string;
}

/** `map_tile_url` and `map_tile_attribution` are not sent yet; defaults stand in. */
export const getTileConfig = (setting: Maybe<AppSettings>): TileConfig => ({
  url: String(setting?.map_tile_url ?? "").trim() || OSM_DEFAULT_TILE_URL,
  attribution: String(setting?.map_tile_attribution ?? "").trim() || OSM_DEFAULT_ATTRIBUTION,
});

/**
 * The public Nominatim server: about one request a second and no heavy
 * commercial use. Production should point `map_geocoder_url` at its own
 * instance or a backend proxy that speaks the same `/search` + `/reverse` API.
 */
export const OSM_DEFAULT_GEOCODER_URL = "https://nominatim.openstreetmap.org";

/** `map_geocoder_url` is not sent yet; the public server stands in. */
export const getGeocoderUrl = (setting: Maybe<AppSettings>): string =>
  (String(setting?.map_geocoder_url ?? "").trim() || OSM_DEFAULT_GEOCODER_URL).replace(/\/+$/, "");
