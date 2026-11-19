import { describe, expect, it } from "vitest";
import {
  bearingDegrees,
  boundsOf,
  distanceMeters,
  headingAfterMove,
  isOffRoute,
  toLatLng,
  toRoutePoint,
  trimRouteAtRider,
} from "./geo";

const bhuj = { lat: 23.2419, lng: 69.6669 };

describe("toLatLng", () => {
  // Trap 8: coordinates arrive as numbers or numeric strings and must never be
  // rounded — the app once put them through a 2-decimal money helper and the
  // pin landed ~500 m off.
  it("keeps every decimal of a numeric string", () => {
    expect(toLatLng("23.241956", "69.666912")).toEqual({ lat: 23.241956, lng: 69.666912 });
  });

  it("rejects what is not a position", () => {
    expect(toLatLng(null, null)).toBeNull();
    expect(toLatLng("abc", "1")).toBeNull();
    // 0,0 is the Gulf of Guinea — as a rider position it means "not set".
    expect(toLatLng(0, 0)).toBeNull();
  });
});

describe("distanceMeters", () => {
  it("measures a short hop", () => {
    const north = { lat: bhuj.lat + 0.0009, lng: bhuj.lng };
    expect(Math.round(distanceMeters(bhuj, north))).toBe(100);
  });

  it("is zero without two points", () => {
    expect(distanceMeters(bhuj, null)).toBe(0);
  });
});

describe("bearingDegrees", () => {
  it("points at the compass directions", () => {
    expect(Math.round(bearingDegrees(bhuj, { lat: bhuj.lat + 0.01, lng: bhuj.lng }))).toBe(0);
    expect(Math.round(bearingDegrees(bhuj, { lat: bhuj.lat, lng: bhuj.lng + 0.01 }))).toBe(90);
    expect(Math.round(bearingDegrees(bhuj, { lat: bhuj.lat - 0.01, lng: bhuj.lng }))).toBe(180);
    expect(Math.round(bearingDegrees(bhuj, { lat: bhuj.lat, lng: bhuj.lng - 0.01 }))).toBe(270);
  });
});

describe("headingAfterMove", () => {
  // §3.5: under 5 m is GPS jitter. Turning the scooter on it makes the icon
  // spin while the rider stands still.
  it("ignores a move too small to be travel", () => {
    const jitter = { lat: bhuj.lat + 0.00002, lng: bhuj.lng };
    expect(headingAfterMove(bhuj, jitter, 123)).toBe(123);
  });

  it("turns with a real move", () => {
    const east = { lat: bhuj.lat, lng: bhuj.lng + 0.001 };
    expect(Math.round(headingAfterMove(bhuj, east, 123))).toBe(90);
  });
});

describe("trimRouteAtRider", () => {
  const route = [
    { lat: 23.24, lng: 69.66 },
    { lat: 23.25, lng: 69.67 },
    { lat: 23.26, lng: 69.68 },
    { lat: 23.27, lng: 69.69 },
  ];

  // §3.4: the line is drawn FROM THE RIDER, not from the store — otherwise it
  // keeps showing road the rider has already covered.
  it("drops the road already travelled and starts at the rider", () => {
    const rider = { lat: 23.2505, lng: 69.6705 };
    expect(trimRouteAtRider(route, rider)).toEqual([rider, route[2], route[3]]);
  });

  it("gives the route back untouched without a rider", () => {
    expect(trimRouteAtRider(route, null)).toEqual(route);
  });
});

describe("isOffRoute", () => {
  const route = [
    { lat: 23.24, lng: 69.66 },
    { lat: 23.25, lng: 69.67 },
  ];

  it("is false while the rider is on the line", () => {
    expect(isOffRoute(route, { lat: 23.2401, lng: 69.6601 })).toBe(false);
  });

  it("is true past 75 m off it", () => {
    expect(isOffRoute(route, { lat: 23.2419, lng: 69.6669 })).toBe(true);
  });

  it("has no opinion without a route", () => {
    expect(isOffRoute([], bhuj)).toBe(false);
  });
});

describe("boundsOf", () => {
  it("boxes the points it is given, ignoring the missing ones", () => {
    expect(boundsOf([{ lat: 1, lng: 2 }, null, { lat: 3, lng: -1 }])).toEqual([
      { lat: 1, lng: -1 },
      { lat: 3, lng: 2 },
    ]);
    expect(boundsOf([null])).toBeNull();
  });
});

describe("toRoutePoint", () => {
  // Reading only `{lat,lng}` left the route empty and drew no line, while the
  // ETA still showed — it comes from `route.duration`, not the points.
  it("reads every shape the route endpoint sends", () => {
    expect(toRoutePoint({ lat: 23.24, lng: 69.66 })).toEqual({ lat: 23.24, lng: 69.66 });
    expect(toRoutePoint({ latitude: 23.24, longitude: 69.66 })).toEqual({ lat: 23.24, lng: 69.66 });
    expect(toRoutePoint({ lat: "23.24", lng: "69.66" })).toEqual({ lat: 23.24, lng: 69.66 });
    expect(toRoutePoint([23.24, 69.66])).toEqual({ lat: 23.24, lng: 69.66 });
  });

  // GeoJSON and OSRM order pairs [lng, lat]. That can only be detected when
  // the first value is impossible as a latitude; [69.66, 23.24] is two valid
  // latitudes and genuinely ambiguous, so it is read as [lat, lng] — the
  // order the rest of this API uses.
  it("swaps a pair whose first value cannot be a latitude", () => {
    expect(toRoutePoint([120.5, 23.24])).toEqual({ lat: 23.24, lng: 120.5 });
  });

  it("assumes [lat, lng] when the pair is ambiguous", () => {
    expect(toRoutePoint([69.66, 23.24])).toEqual({ lat: 69.66, lng: 23.24 });
  });

  it("rejects junk instead of plotting it", () => {
    expect(toRoutePoint(null)).toBeNull();
    expect(toRoutePoint({})).toBeNull();
    expect(toRoutePoint(["a", "b"])).toBeNull();
  });
});
