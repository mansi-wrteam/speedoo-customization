import type { Libraries } from "@react-google-maps/api";

export const MAP_CONFIG = {
  id: "google-map-script",
  // Always set in .env; the loader requires a string.
  googleMapsApiKey: process.env.NEXT_PUBLIC_MAP_API as string,
  libraries: ["places"] as Libraries,
};
