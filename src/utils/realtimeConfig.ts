// Turning the backend's `realtime` block into a pusher-js connection
// (WEB_PARITY_V4.0.2 §3.1–§3.2).
//
// Reverb speaks the Pusher protocol, so one client covers both drivers.
import type { RealtimeSettings } from "@/types/models/settings";

type Maybe<T> = T | null | undefined;

const text = (value: Maybe<string | number>) => String(value ?? "").trim();

/**
 * Usable only when ALL of these hold: enabled, a driver we speak, a key, a
 * host or a cluster to reach, and an endpoint to authorise against. Anything
 * less and the caller polls instead — which it does anyway as a backstop.
 */
export const isRealtimeUsable = (realtime: Maybe<RealtimeSettings>): boolean => {
  if (!realtime?.enabled) return false;
  const driver = text(realtime.broadcast_driver).toLowerCase();
  if (driver !== "pusher" && driver !== "reverb") return false;
  if (!text(realtime.key)) return false;
  if (!text(realtime.host) && !text(realtime.cluster)) return false;
  return Boolean(text(realtime.customer_auth_endpoint));
};

export interface PusherConnection {
  key: string;
  options: {
    cluster?: string;
    wsHost?: string;
    wsPort?: number;
    wssPort?: number;
    forceTLS: boolean;
    enabledTransports: ("ws" | "wss")[];
    authEndpoint: string;
    auth: { headers: Record<string, string> };
  };
}

/**
 * §3.1: an empty `host` means Pusher cloud, reached by `cluster` over wss.
 * Otherwise it is a self-hosted Reverb at `host`:`port`, plain `ws` when the
 * scheme says http/ws and `wss` for anything else.
 */
export const buildPusherConnection = (
  realtime: Maybe<RealtimeSettings>,
  headers: Record<string, string>
): PusherConnection | null => {
  if (!isRealtimeUsable(realtime)) return null;

  const host = text(realtime!.host);
  const scheme = text(realtime!.scheme).toLowerCase();
  const authEndpoint = text(realtime!.customer_auth_endpoint);

  if (!host) {
    return {
      key: text(realtime!.key),
      options: {
        cluster: text(realtime!.cluster),
        forceTLS: true,
        enabledTransports: ["wss"],
        authEndpoint,
        auth: { headers },
      },
    };
  }

  const plain = scheme === "http" || scheme === "ws";
  const port = Number(realtime!.port) || (plain ? 80 : 443);
  return {
    key: text(realtime!.key),
    options: {
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: !plain,
      enabledTransports: plain ? ["ws"] : ["wss"],
      authEndpoint,
      auth: { headers },
    },
  };
};

/**
 * The channel an order's rider broadcasts on.
 *
 * Built in ONE place on purpose: multi-seller orders will append
 * `.{sellerId}`, and the backend asked for a single spot to change (§3.2).
 */
export const orderTrackingChannel = (orderId: Maybe<string | number>) =>
  `private-order-tracking.${orderId}`;

/** The only event we listen for on that channel. */
export const DRIVER_LOCATION_EVENT = "driver_location";

export interface DriverLocationEvent {
  order_id?: string | number;
  latitude?: string | number;
  longitude?: string | number;
  tracked_at?: string;
}

/**
 * Drop an event that names another order, or that carries no coordinates
 * (§3.2) — a shared connection can deliver both.
 */
export const isEventForOrder = (
  event: Maybe<DriverLocationEvent>,
  orderId: Maybe<string | number>
): boolean => {
  if (!event) return false;
  if (event.order_id != null && String(event.order_id) !== String(orderId)) return false;
  return event.latitude != null && event.longitude != null;
};
