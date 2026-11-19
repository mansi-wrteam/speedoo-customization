// Map geometry for rider tracking (WEB_PARITY_V4.0.2 §3.4–§3.5).
//
// Trap 8: NEVER round coordinates. The app once passed them through its
// 2-decimal money helper and the pin landed about 500 m off. Everything here
// takes and returns raw numbers.

export interface LatLng {
  lat: number;
  lng: number;
}

type Maybe<T> = T | null | undefined;

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Coordinates as the API sends them: numbers, or numeric strings. */
export const toLatLng = (
  lat: Maybe<number | string>,
  lng: Maybe<number | string>
): LatLng | null => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  // 0,0 is in the Gulf of Guinea; as a rider position it means "not set".
  if (latitude === 0 && longitude === 0) return null;
  return { lat: latitude, lng: longitude };
};

/**
 * One point of a route, in whatever shape the backend sent it.
 *
 * `live_tracking_route` has been seen sending `{lat,lng}`, `{latitude,
 * longitude}` and bare pairs. Reading only `{lat,lng}` produced an empty
 * route and no line on the map, while the ETA — which comes from
 * `route.duration`, not the points — still showed. So accept all three.
 */
export const toRoutePoint = (point: unknown): LatLng | null => {
  if (point == null) return null;

  if (Array.isArray(point)) {
    const [first, second] = point as unknown[];
    const a = Number(first);
    const b = Number(second);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    // GeoJSON (and OSRM) order pairs [lng, lat]; most of this API uses
    // [lat, lng]. Latitude cannot exceed 90, so a first value beyond that
    // settles it; otherwise take the common [lat, lng].
    return Math.abs(a) > 90 ? toLatLng(b, a) : toLatLng(a, b);
  }

  const record = point as Record<string, unknown>;
  return toLatLng(
    (record.lat ?? record.latitude) as number | string,
    (record.lng ?? record.lon ?? record.longitude) as number | string
  );
};

/** Great-circle distance in metres. */
export const distanceMeters = (a: Maybe<LatLng>, b: Maybe<LatLng>): number => {
  if (!a || !b) return 0;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

/** Compass bearing from `a` to `b`, 0–360 with 0 = north. */
export const bearingDegrees = (a: Maybe<LatLng>, b: Maybe<LatLng>): number => {
  if (!a || !b) return 0;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLng = toRadians(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

/** Moves under this are GPS jitter, not travel, and must not spin the icon (§3.5). */
export const MIN_HEADING_MOVE_M = 5;

/**
 * The scooter's heading after a move, or `previous` when the move was too
 * small to mean anything. Before any move the caller points it at the
 * customer.
 */
export const headingAfterMove = (
  from: Maybe<LatLng>,
  to: Maybe<LatLng>,
  previous: number
): number => {
  if (!from || !to) return previous;
  if (distanceMeters(from, to) < MIN_HEADING_MOVE_M) return previous;
  return bearingDegrees(from, to);
};

/** Index of the route point closest to `point`. */
const nearestIndex = (route: LatLng[], point: LatLng) => {
  let best = 0;
  let bestDistance = Infinity;
  route.forEach((step, index) => {
    const distance = distanceMeters(step, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return { index: best, distance: bestDistance };
};

/**
 * §3.4: draw the line FROM THE RIDER, not from the store — trim the route at
 * the point nearest them, and start it at their actual position so the line
 * meets the icon.
 */
export const trimRouteAtRider = (route: Maybe<LatLng[]>, rider: Maybe<LatLng>): LatLng[] => {
  const path = route || [];
  if (!rider || path.length === 0) return path;
  const { index } = nearestIndex(path, rider);
  return [rider, ...path.slice(index + 1)];
};

/** How far off the drawn line the rider may drift before it is re-fetched (§3.4). */
export const OFF_ROUTE_THRESHOLD_M = 75;

/** True when the rider has wandered far enough off the line to need a new one. */
export const isOffRoute = (route: Maybe<LatLng[]>, rider: Maybe<LatLng>): boolean => {
  const path = route || [];
  if (!rider || path.length === 0) return false;
  return nearestIndex(path, rider).distance > OFF_ROUTE_THRESHOLD_M;
};

/** A box that holds every point, for fitting the map to the journey. */
export const boundsOf = (points: Maybe<LatLng>[]): [LatLng, LatLng] | null => {
  const real = points.filter(Boolean) as LatLng[];
  if (real.length === 0) return null;
  const lats = real.map((point) => point.lat);
  const lngs = real.map((point) => point.lng);
  return [
    { lat: Math.min(...lats), lng: Math.min(...lngs) },
    { lat: Math.max(...lats), lng: Math.max(...lngs) },
  ];
};
