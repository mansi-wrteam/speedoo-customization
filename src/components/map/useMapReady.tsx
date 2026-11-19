import React, { useEffect, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { MAP_CONFIG } from "@/utils/mapConfig";
import { getMapProvider, type MapProvider } from "@/utils/mapProvider";
import type { AppSettings } from "@/types/models/settings";

interface GoogleLoadState {
  loaded: boolean;
  failed: boolean;
}

/** Rendered only for Google, so an OSM shop never fetches the Maps script. */
const GoogleMapsLoader = ({ onChange }: { onChange: (state: GoogleLoadState) => void }) => {
  const { isLoaded, loadError } = useJsApiLoader(MAP_CONFIG);
  useEffect(() => {
    onChange({ loaded: isLoaded, failed: Boolean(loadError) });
  }, [isLoaded, loadError, onChange]);
  return null;
};

/**
 * Which map the shop uses and whether it can be drawn and geocoded yet.
 * Render `loader` somewhere in the tree: it is the Google script loader, or
 * nothing for OSM (Leaflet and Nominatim need no script).
 *
 * Until settings arrive the provider is unknown, so nothing loads — an OSM
 * shop must not pull the Google script just because it renders first.
 * `failed` means the Google script could not load (bad key, blocked).
 */
export const useMapReady = (
  setting: AppSettings | null | undefined
): { provider: MapProvider; ready: boolean; failed: boolean; loader: React.ReactNode } => {
  const provider = getMapProvider(setting);
  const known = Boolean(setting);
  const [google, setGoogle] = useState<GoogleLoadState>({ loaded: false, failed: false });
  return {
    provider,
    ready: known && (provider === "osm" || google.loaded),
    failed: known && provider === "google" && google.failed,
    loader: known && provider === "google" ? <GoogleMapsLoader onChange={setGoogle} /> : null,
  };
};
