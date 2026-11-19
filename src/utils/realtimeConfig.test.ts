import { describe, expect, it } from "vitest";
import {
  buildPusherConnection,
  isEventForOrder,
  isRealtimeUsable,
  orderTrackingChannel,
} from "./realtimeConfig";
import type { RealtimeSettings } from "@/types/models/settings";

const cloud: RealtimeSettings = {
  enabled: true,
  broadcast_driver: "pusher",
  key: "abc",
  cluster: "ap2",
  host: "",
  port: null,
  scheme: "",
  customer_auth_endpoint: "https://api.test/broadcasting/auth",
};

describe("isRealtimeUsable", () => {
  it("accepts a complete config", () => {
    expect(isRealtimeUsable(cloud)).toBe(true);
    expect(isRealtimeUsable({ ...cloud, broadcast_driver: "reverb", host: "rt.test" })).toBe(true);
  });

  it("refuses anything incomplete, and falls back to polling", () => {
    expect(isRealtimeUsable(null)).toBe(false);
    expect(isRealtimeUsable({ ...cloud, enabled: false })).toBe(false);
    expect(isRealtimeUsable({ ...cloud, broadcast_driver: "ably" })).toBe(false);
    expect(isRealtimeUsable({ ...cloud, key: "" })).toBe(false);
    expect(isRealtimeUsable({ ...cloud, cluster: "", host: "" })).toBe(false);
    expect(isRealtimeUsable({ ...cloud, customer_auth_endpoint: "" })).toBe(false);
  });
});

describe("buildPusherConnection", () => {
  const headers = { Authorization: "Bearer T" };

  it("reaches Pusher cloud by cluster over wss when there is no host", () => {
    const connection = buildPusherConnection(cloud, headers);
    expect(connection?.options.cluster).toBe("ap2");
    expect(connection?.options.wsHost).toBeUndefined();
    expect(connection?.options.forceTLS).toBe(true);
    expect(connection?.options.enabledTransports).toEqual(["wss"]);
  });

  it("uses plain ws for a self-hosted http scheme", () => {
    const connection = buildPusherConnection(
      { ...cloud, broadcast_driver: "reverb", host: "rt.test", port: 8080, scheme: "http" },
      headers
    );
    expect(connection?.options.wsHost).toBe("rt.test");
    expect(connection?.options.wsPort).toBe(8080);
    expect(connection?.options.forceTLS).toBe(false);
    expect(connection?.options.enabledTransports).toEqual(["ws"]);
  });

  it("defaults a self-hosted port by scheme", () => {
    expect(
      buildPusherConnection({ ...cloud, host: "rt.test", scheme: "https" }, headers)?.options.wsPort
    ).toBe(443);
  });

  it("builds nothing from an unusable config", () => {
    expect(buildPusherConnection({ ...cloud, enabled: false }, headers)).toBeNull();
  });
});

describe("orderTrackingChannel", () => {
  // Built in one place because multi-seller orders will append `.{sellerId}`.
  it("names the order's private channel", () => {
    expect(orderTrackingChannel(42)).toBe("private-order-tracking.42");
  });
});

describe("isEventForOrder", () => {
  it("takes an event for this order with coordinates", () => {
    expect(isEventForOrder({ order_id: 42, latitude: 1, longitude: 2 }, 42)).toBe(true);
    expect(isEventForOrder({ order_id: "42", latitude: 1, longitude: 2 }, 42)).toBe(true);
  });

  it("drops another order's event, and one with no position", () => {
    expect(isEventForOrder({ order_id: 7, latitude: 1, longitude: 2 }, 42)).toBe(false);
    expect(isEventForOrder({ order_id: 42 }, 42)).toBe(false);
    expect(isEventForOrder(null, 42)).toBe(false);
  });
});
