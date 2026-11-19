import { afterEach, describe, expect, it, vi } from "vitest";
import {
  forwardGeocode,
  fromNominatim,
  NOMINATIM_MIN_GAP_MS,
  nominatimParts,
  resetGeocoderState,
  reverseGeocode,
} from "./geocoder";
import { getGeocoderUrl, OSM_DEFAULT_GEOCODER_URL } from "./mapProvider";
import type { AppSettings } from "@/types/models/settings";

const osm = { map_provider: "osm" } as AppSettings;

const bhujPlace = {
  lat: "23.241956",
  lon: "69.666912",
  display_name: "Station Road, Bhuj, Kachchh, Gujarat, 370001, India",
  address: {
    house_number: "12",
    road: "Station Road",
    suburb: "Uma Nagar",
    town: "Bhuj",
    county: "Kachchh",
    state: "Gujarat",
    postcode: "370001",
    country: "India",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  resetGeocoderState();
});

describe("nominatimParts", () => {
  it("maps Nominatim's address onto the form fields", () => {
    expect(nominatimParts(bhujPlace.address)).toEqual({
      address: "12 Station Road",
      landmark: "Uma Nagar",
      area: "Uma Nagar",
      city: "Bhuj",
      state: "Gujarat",
      country: "India",
      pincode: "370001",
    });
  });

  it("leaves what is missing blank for the user to fill in", () => {
    expect(nominatimParts({ village: "Madhapar", country: "India" })).toEqual({
      address: "",
      landmark: "",
      area: "",
      city: "Madhapar",
      state: "",
      country: "India",
      pincode: "",
    });
    expect(nominatimParts(undefined).city).toBe("");
  });
});

describe("fromNominatim", () => {
  it("keeps every decimal of the coordinates", () => {
    expect(fromNominatim(bhujPlace)).toMatchObject({ lat: 23.241956, lng: 69.666912 });
  });

  it("treats an error reply or no place as nothing found", () => {
    expect(fromNominatim({ error: "Unable to geocode" } as never)).toBeNull();
    expect(fromNominatim(undefined)).toBeNull();
  });
});

describe("getGeocoderUrl", () => {
  it("falls back to the public server and drops a trailing slash", () => {
    expect(getGeocoderUrl(osm)).toBe(OSM_DEFAULT_GEOCODER_URL);
    expect(getGeocoderUrl({ ...osm, map_geocoder_url: "https://geo.example.com/" })).toBe(
      "https://geo.example.com"
    );
  });
});

describe("OSM geocoding", () => {
  it("reverse geocodes through Nominatim, never Google", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => bhujPlace });
    vi.stubGlobal("fetch", fetchMock);

    const result = await reverseGeocode(osm, { lat: 23.24, lng: 69.66 });

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${OSM_DEFAULT_GEOCODER_URL}/reverse?format=jsonv2&addressdetails=1&lat=23.24&lon=69.66`
    );
    expect(result?.formattedAddress).toBe(bhujPlace.display_name);
  });

  it("forward geocodes the first match and encodes the query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [bhujPlace] });
    vi.stubGlobal("fetch", fetchMock);

    const result = await forwardGeocode(osm, "Station Road, Bhuj");

    expect(fetchMock.mock.calls[0][0]).toContain("/search?");
    expect(fetchMock.mock.calls[0][0]).toContain("q=Station%20Road%2C%20Bhuj");
    expect(result).toMatchObject({ lat: 23.241956, lng: 69.666912 });
  });

  it("throws when the server refuses, so callers can give the form back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(reverseGeocode(osm, { lat: 1, lng: 1 })).rejects.toThrow("429");
  });
});

describe("Nominatim request shaping", () => {
  it("prefers matches near the delivery city and asks in the site language", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [bhujPlace] });
    vi.stubGlobal("fetch", fetchMock);

    await forwardGeocode(osm, "Station Road", { near: { lat: 23, lng: 69 }, language: "ar" });

    const url = fetchMock.mock.calls[0][0] as string;
    // left,top,right,bottom — and NOT bounded, so a foreign address still resolves.
    expect(url).toContain("&viewbox=68.5,23.5,69.5,22.5");
    expect(url).not.toContain("bounded");
    expect(url).toContain("&accept-language=ar");
  });

  it("answers a repeated question from the cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => bhujPlace });
    vi.stubGlobal("fetch", fetchMock);

    await reverseGeocode(osm, { lat: 23.24, lng: 69.66 });
    const again = await reverseGeocode(osm, { lat: 23.24, lng: 69.66 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(again?.formattedAddress).toBe(bhujPlace.display_name);
  });

  it("does not cache a failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, json: async () => bhujPlace });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    await expect(reverseGeocode(osm, { lat: 5, lng: 5 })).rejects.toThrow("429");
    const retry = reverseGeocode(osm, { lat: 5, lng: 5 });
    await vi.advanceTimersByTimeAsync(NOMINATIM_MIN_GAP_MS);

    expect((await retry)?.lat).toBe(23.241956);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("spaces requests at least a second apart (public server rate limit)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => bhujPlace });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    const first = reverseGeocode(osm, { lat: 1, lng: 1 });
    const second = reverseGeocode(osm, { lat: 2, lng: 2 });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(NOMINATIM_MIN_GAP_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
