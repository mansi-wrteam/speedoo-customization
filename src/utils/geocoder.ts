// Address <-> coordinate lookups for the location and address pickers (§4).
//
// Google geocodes through the Maps JS API, so the script must already be
// loaded (see useMapReady). OSM geocodes through a Nominatim-compatible server
// with a plain fetch, so a shop on OSM makes no Google request at all.
import type { AppSettings } from "@/types/models/settings";
import type { LatLng } from "@/utils/geo";
import { getGeocoderUrl, getMapProvider } from "@/utils/mapProvider";

type Maybe<T> = T | null | undefined;

/** The address form's fields, as far as the geocoder could fill them. */
export interface AddressParts {
  address: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface GeocodeResult extends LatLng {
  formattedAddress: string;
  parts: AddressParts;
}

export interface GeocodeOptions {
  /** Site language code (`?lang=`), so addresses come back in it. */
  language?: string;
  /**
   * Forward lookups only: prefer matches around here (the delivery city), so
   * "Station Road" finds the local one rather than one abroad. A preference,
   * not a fence — a clearly foreign address still resolves.
   */
  near?: LatLng | null;
}

/** About 50 km each way: a city and its outskirts. */
const NEAR_SPAN_DEG = 0.5;

// ---------------------------------------------------------------- Google

const googleParts = (components: google.maps.GeocoderAddressComponent[]): AddressParts => {
  const parts: AddressParts = {
    address: "",
    landmark: "",
    area: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
  };
  // Later components win, as they always have in the address modal.
  components.forEach((component) => {
    const { types, long_name } = component;
    if (types.includes("premise") || types.includes("plus_code") || types.includes("route")) {
      parts.address = long_name;
    }
    if (types.includes("political")) parts.landmark = long_name;
    if (
      types.includes("administrative_area_level_3") ||
      types.includes("administrative_area_level_2") ||
      types.includes("sublocality")
    ) {
      parts.area = long_name;
    }
    if (types.includes("administrative_area_level_1")) parts.state = long_name;
    if (types.includes("country")) parts.country = long_name;
    if (types.includes("postal_code")) parts.pincode = long_name;
    if (types.includes("locality")) parts.city = long_name;
  });
  return parts;
};

const fromGoogle = (result: Maybe<google.maps.GeocoderResult>): GeocodeResult | null =>
  result
    ? {
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        formattedAddress: result.formatted_address,
        parts: googleParts(result.address_components),
      }
    : null;

const googleReverse = async (point: LatLng, { language }: GeocodeOptions) => {
  const { results } = await new window.google.maps.Geocoder().geocode({
    location: point,
    ...(language ? { language } : {}),
  });
  return fromGoogle(results[0]);
};

const googleForward = async (query: string, { language, near }: GeocodeOptions) => {
  const { results } = await new window.google.maps.Geocoder().geocode({
    address: query,
    ...(language ? { language } : {}),
    ...(near
      ? {
          bounds: {
            north: near.lat + NEAR_SPAN_DEG,
            south: near.lat - NEAR_SPAN_DEG,
            east: near.lng + NEAR_SPAN_DEG,
            west: near.lng - NEAR_SPAN_DEG,
          },
        }
      : {}),
  });
  return fromGoogle(results[0]);
};

// ---------------------------------------------------------------- Nominatim

export interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string | undefined>;
  /** Set instead of a place when nothing is there ("Unable to geocode"). */
  error?: string;
}

export const nominatimParts = (address: NominatimPlace["address"] = {}): AddressParts => ({
  address:
    [address.house_number, address.road].filter(Boolean).join(" ") ||
    address.amenity ||
    address.building ||
    "",
  landmark: address.neighbourhood || address.suburb || address.quarter || "",
  area: address.suburb || address.city_district || address.county || address.state_district || "",
  city: address.city || address.town || address.village || address.municipality || "",
  state: address.state || "",
  country: address.country || "",
  pincode: address.postcode || "",
});

export const fromNominatim = (place: Maybe<NominatimPlace>): GeocodeResult | null => {
  if (!place || place.error) return null;
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    formattedAddress: place.display_name,
    parts: nominatimParts(place.address),
  };
};

/**
 * The public Nominatim server bans clients that go over one request a second,
 * and a pin dragged back and forth easily does. Every request takes the next
 * free slot at least this far after the previous one.
 */
export const NOMINATIM_MIN_GAP_MS = 1100;
let nextFreeSlot = 0;

const waitForSlot = async () => {
  const now = Date.now();
  const slot = Math.max(now, nextFreeSlot);
  nextFreeSlot = slot + NOMINATIM_MIN_GAP_MS;
  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
};

/** Same question, same answer: a revisited point or address costs no request. */
const CACHE_LIMIT = 100;
const cache = new Map<string, unknown>();

/** Test hook: forget the cache and the rate-limit clock. */
export const resetGeocoderState = () => {
  cache.clear();
  nextFreeSlot = 0;
};

const nominatimGet = async <T>(url: string): Promise<T> => {
  if (cache.has(url)) return cache.get(url) as T;
  await waitForSlot();
  // The browser adds Referer, which is what Nominatim's usage policy asks a
  // web page to identify itself with.
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Geocoder responded ${response.status}`);
  const data = (await response.json()) as T;
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(url, data);
  return data;
};

const languageParam = (language?: string) =>
  language ? `&accept-language=${encodeURIComponent(language)}` : "";

const nominatimReverse = async (baseUrl: string, point: LatLng, { language }: GeocodeOptions) =>
  fromNominatim(
    await nominatimGet<NominatimPlace>(
      `${baseUrl}/reverse?format=jsonv2&addressdetails=1&lat=${point.lat}&lon=${point.lng}${languageParam(language)}`
    )
  );

const nominatimForward = async (
  baseUrl: string,
  query: string,
  { language, near }: GeocodeOptions
) => {
  // viewbox is left,top,right,bottom; without `bounded=1` it only ranks.
  const viewbox = near
    ? `&viewbox=${near.lng - NEAR_SPAN_DEG},${near.lat + NEAR_SPAN_DEG},${near.lng + NEAR_SPAN_DEG},${near.lat - NEAR_SPAN_DEG}`
    : "";
  return fromNominatim(
    (
      await nominatimGet<NominatimPlace[]>(
        `${baseUrl}/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(query)}${viewbox}${languageParam(language)}`
      )
    )[0]
  );
};

// ---------------------------------------------------------------- Public

/** Coordinate → address. `null` when the provider has nothing there; throws when the call fails. */
export const reverseGeocode = (
  setting: Maybe<AppSettings>,
  point: LatLng,
  options: GeocodeOptions = {}
) =>
  getMapProvider(setting) === "osm"
    ? nominatimReverse(getGeocoderUrl(setting), point, options)
    : googleReverse(point, options);

/** Address → coordinate. `null` when nothing matches; throws when the call fails. */
export const forwardGeocode = (
  setting: Maybe<AppSettings>,
  query: string,
  options: GeocodeOptions = {}
) =>
  getMapProvider(setting) === "osm"
    ? nominatimForward(getGeocoderUrl(setting), query, options)
    : googleForward(query, options);
