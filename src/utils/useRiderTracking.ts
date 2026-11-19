// Following the rider (WEB_PARITY_V4.0.2 §3.2–§3.4).
//
// Two sources, one picture: pushed positions over Pusher/Reverb, and a poll
// that keeps working when they do not. The poll is NOT a fallback for broken
// setups only — the spec is explicit that pushes are unconfirmed on dev, so it
// is what actually moves the pin today.
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import * as api from "@/api/apiRoutes";
import {
  headingAfterMove,
  isOffRoute,
  toLatLng,
  toRoutePoint,
  trimRouteAtRider,
  type LatLng,
} from "@/utils/geo";
import {
  buildPusherConnection,
  DRIVER_LOCATION_EVENT,
  isEventForOrder,
  orderTrackingChannel,
  type DriverLocationEvent,
} from "@/utils/realtimeConfig";
import type { Id } from "@/types/common";
import type { RootState } from "@/types/state";

/** §3.4's timers, named so the numbers are not scattered through the effects. */
const BACKUP_POLL_MS = 25_000;
const QUIET_POLL_MS = 10_000;
/** A pushed position counts as fresh for this long; polls are ignored meanwhile. */
const PUSH_FRESH_MS = 25_000;
const ROUTE_REFRESH_MS = 45_000;
/** A re-route may be triggered at most this often, however far the rider strays. */
const REROUTE_COOLDOWN_MS = 15_000;

export interface UseRiderTrackingOptions {
  orderId: Maybe<Id>;
  /** Where the order is going, from the order itself. */
  destination: Maybe<LatLng>;
  /** Only track while the modal is open. */
  active: boolean;
}

type Maybe<T> = T | null | undefined;

export interface RiderTracking {
  rider: LatLng | null;
  /** The road ahead of the rider, already trimmed to their position. */
  route: LatLng[];
  /** Seconds, or null when there is no road route (trap 7: 0 is not "arrived"). */
  durationSeconds: number | null;
  /** Compass bearing for the scooter icon. */
  heading: number;
  /** No position for this rider yet — the map shows "not live yet". */
  unavailable: boolean;
  /** Pushes are connected and arriving. */
  live: boolean;
  refresh: () => void;
}

export const useRiderTracking = ({
  orderId,
  destination,
  active,
}: UseRiderTrackingOptions): RiderTracking => {
  const realtime = useSelector((state: RootState) => state.Setting.realtime);
  const token = useSelector((state: RootState) => state.User?.jwtToken);
  const languageCode = useSelector(
    (state: RootState) => state.Language.selectedLanguage?.code
  );
  const moduleId = useSelector((state: RootState) => state.Module.activeModuleId);

  const [rider, setRider] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const [live, setLive] = useState(false);

  // Refs, not state: the timers read these without being torn down and rebuilt
  // every time the rider moves.
  const riderRef = useRef<LatLng | null>(null);
  const routeRef = useRef<LatLng[]>([]);
  const lastPushAt = useRef(0);
  const lastRerouteAt = useRef(0);

  /** Before the first move the scooter points at the customer, not north. */
  const applyPosition = useCallback(
    (next: LatLng | null) => {
      if (!next) return;
      const previous = riderRef.current;
      setHeading((current) =>
        previous ? headingAfterMove(previous, next, current) : 0
      );
      riderRef.current = next;
      setRider(next);
      setUnavailable(false);
    },
    []
  );

  const fetchRoute = useCallback(async () => {
    if (!orderId) return;
    try {
      const response = await api.getLiveTrackingRoute({ orderId });
      const data = response?.data;
      const driver = toLatLng(data?.driver?.lat, data?.driver?.lng);
      if (driver) applyPosition(driver);

      const duration = Number(data?.route?.duration ?? 0);
      // 0 is the straight-line fallback, not an arrival (trap 7).
      setDurationSeconds(duration > 0 ? duration : null);

      const coordinates = (data?.route?.coordinates || [])
        .map(toRoutePoint)
        .filter(Boolean) as LatLng[];
      // `is_road_path: false` means there is no road line to draw at all.
      routeRef.current = data?.route?.is_road_path === false ? [] : coordinates;
      setRoute(routeRef.current);
    } catch (error) {
      console.log("Error", error);
    }
  }, [applyPosition, orderId]);

  /** The backup poll. Ignored while a pushed position is still fresh. */
  const pollPosition = useCallback(async () => {
    if (!orderId) return;
    if (Date.now() - lastPushAt.current < PUSH_FRESH_MS) return;
    try {
      const response = await api.liveOrderTracking({ orderId });
      if (response?.status != 1) {
        if (!riderRef.current) setUnavailable(true);
        return;
      }
      const next = toLatLng(response?.data?.latitude, response?.data?.longitude);
      if (next) applyPosition(next);
      else if (!riderRef.current) setUnavailable(true);
    } catch (error) {
      console.log("Error", error);
    }
  }, [applyPosition, orderId]);

  // Pushed positions.
  useEffect(() => {
    if (!active || !orderId) return;
    const connection = buildPusherConnection(realtime, {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Language": languageCode ?? "en",
      "X-Module-Id": String(moduleId ?? ""),
    });
    if (!connection) return;

    let cancelled = false;
    let client: { disconnect: () => void; unsubscribe: (name: string) => void } | null = null;

    // Imported lazily so the websocket client is not in the bundle of every
    // page that merely renders an order row.
    import("pusher-js")
      .then(({ default: Pusher }) => {
        if (cancelled) return;
        // pusher-js types `cluster` as required even for a self-hosted host,
        // where it is genuinely absent.
        const pusher = new Pusher(
          connection.key,
          connection.options as unknown as ConstructorParameters<typeof Pusher>[1]
        );
        client = pusher as unknown as typeof client;
        const channelName = orderTrackingChannel(orderId);
        const channel = pusher.subscribe(channelName);
        channel.bind(DRIVER_LOCATION_EVENT, (event: DriverLocationEvent) => {
          // A shared connection delivers other orders' events too (§3.2).
          if (!isEventForOrder(event, orderId)) return;
          const next = toLatLng(event.latitude, event.longitude);
          if (!next) return;
          lastPushAt.current = Date.now();
          setLive(true);
          applyPosition(next);
        });
      })
      .catch((error) => console.log("Error", error));

    return () => {
      cancelled = true;
      setLive(false);
      try {
        client?.unsubscribe(orderTrackingChannel(orderId));
        client?.disconnect();
      } catch (error) {
        console.log("Error", error);
      }
    };
  }, [active, applyPosition, languageCode, moduleId, orderId, realtime, token]);

  // The poll. Slower while pushes are arriving, faster when they are not.
  useEffect(() => {
    if (!active || !orderId) return;
    pollPosition();
    const interval = live ? BACKUP_POLL_MS : QUIET_POLL_MS;
    const timer = setInterval(pollPosition, interval);
    return () => clearInterval(timer);
  }, [active, live, orderId, pollPosition]);

  // The road route.
  useEffect(() => {
    if (!active || !orderId) return;
    fetchRoute();
    const timer = setInterval(fetchRoute, ROUTE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [active, fetchRoute, orderId]);

  // Strayed off the drawn line: ask for a new one, at most once per 15 s.
  useEffect(() => {
    if (!active || !rider) return;
    if (!isOffRoute(routeRef.current, rider)) return;
    if (Date.now() - lastRerouteAt.current < REROUTE_COOLDOWN_MS) return;
    lastRerouteAt.current = Date.now();
    fetchRoute();
  }, [active, fetchRoute, rider]);

  // A tab in the background gets no pushes and its timers are throttled.
  useEffect(() => {
    if (!active) return;
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      pollPosition();
      fetchRoute();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [active, fetchRoute, pollPosition]);

  // Point at the customer until the rider has actually moved somewhere.
  useEffect(() => {
    if (rider || !destination) return;
    setHeading(0);
  }, [destination, rider]);

  const refresh = useCallback(() => {
    setUnavailable(false);
    pollPosition();
    fetchRoute();
  }, [fetchRoute, pollPosition]);

  return {
    rider,
    route: trimRouteAtRider(route, rider),
    durationSeconds,
    heading,
    unavailable: unavailable && !rider,
    live,
    refresh,
  };
};
