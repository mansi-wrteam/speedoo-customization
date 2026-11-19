// The Quick Delivery ETA row on the order summary (WEB_PARITY_V4.0.2 §2.3).
//
// Trap 4: `delivery_minutes` is the admin's PROMISE for the slot, not a
// measurement — nothing on the backend tracks it. So the row counts down from
// it and then says "Arriving · Soon". Never "0 Minutes", never a negative.
import { formatDuration, minutesBetween, parseApiDate, type PanelFormats } from "@/utils/apiDate";
import type { Order } from "@/types/models";

type Maybe<T> = T | null | undefined;

/** Which copy key the row's label uses. */
export type EtaKind = "delivery_in" | "arriving_in" | "arriving" | "delivered_in";

export interface OrderEta {
  kind: EtaKind;
  /** Pre-formatted value: "10 Minutes", "2 Hours", or the "Soon" label. */
  value: string;
}

export interface EtaLabels {
  minute: string;
  hour: string;
  soon: string;
}

export interface OrderEtaInput {
  order: Maybe<Order>;
  /** `data.route.duration` in seconds from `live_tracking_route`; 0 means no road route. */
  routeDurationSeconds?: Maybe<number>;
  labels: EtaLabels;
  formats?: PanelFormats;
  /** Injectable for tests. */
  now?: Date;
}

/** Quick orders carry `delivery_minutes`; fixed-window ones carry `estimate_date`. Never both. */
export const isQuickOrder = (order: Maybe<Order>) =>
  order?.delivery_minutes != null && Number(order.delivery_minutes) > 0;

/**
 * When the order was placed. `created_at` is ISO UTC and is preferred; `date`
 * is the panel-format fallback.
 */
const placedAt = (order: Maybe<Order>, formats: PanelFormats) =>
  parseApiDate(order?.created_at, formats) ?? parseApiDate(order?.date, formats);

/**
 * How long the order actually took: the status-history entry with code 6,
 * minus `date`. Both are panel-format and in the shop's timezone, so they
 * subtract safely. Minimum one minute — "Delivered In 0 Minutes" reads as a
 * bug, not as speed.
 */
export const deliveredInMinutes = (order: Maybe<Order>, formats: PanelFormats = {}) => {
  const delivered = (order?.status || []).find((entry) => Number(entry?.[0]) === 6)?.[1];
  if (!delivered) return null;
  const minutes = minutesBetween(order?.date, delivered, formats);
  if (minutes == null) return null;
  return Math.max(1, Math.round(minutes));
};

/**
 * The ETA row, or null when there should be none.
 *
 * | active_status | row |
 * |---|---|
 * | 1 (payment pending) | Delivery in · the promise |
 * | 2, 3, 4 | Arriving in · countdown |
 * | 5 | Arriving in · the rider's road time, else the countdown |
 * | 2–5 past zero | Arriving · Soon |
 * | 6 | Delivered In · what it really took |
 * | 7, 8 | hidden |
 */
export const getOrderEta = ({
  order,
  routeDurationSeconds,
  labels,
  formats = {},
  now = new Date(),
}: OrderEtaInput): OrderEta | null => {
  const status = Number(order?.active_status);
  const duration = (minutes: Maybe<number>) =>
    formatDuration(minutes, { minute: labels.minute, hour: labels.hour });

  if (status === 6) {
    const minutes = deliveredInMinutes(order, formats);
    // No code-6 entry means we cannot say how long it took, so say nothing.
    if (minutes == null) return null;
    return { kind: "delivered_in", value: duration(minutes) as string };
  }

  // Cancelled and returned orders have no arrival to describe.
  if (!Number.isFinite(status) || status >= 7) return null;
  if (!isQuickOrder(order)) return null;

  const promised = Number(order?.delivery_minutes);

  if (status === 1) {
    // Nothing is moving until payment lands, so show the promise itself
    // rather than a countdown that is already running.
    const value = duration(promised);
    return value ? { kind: "delivery_in", value } : null;
  }

  // Out for delivery: the rider's real road time wins when there is one.
  // `duration: 0` means the straight-line fallback (trap 7) — not "arrived".
  if (status === 5 && Number(routeDurationSeconds) > 0) {
    const minutes = Math.ceil(Number(routeDurationSeconds) / 60);
    const value = duration(minutes);
    if (value) return { kind: "arriving_in", value };
  }

  const placed = placedAt(order, formats);
  if (!placed) {
    const value = duration(promised);
    return value ? { kind: "arriving_in", value } : null;
  }

  const elapsedMinutes = (now.getTime() - placed.getTime()) / 60000;
  const remaining = Math.ceil(promised - elapsedMinutes);
  if (remaining <= 0) return { kind: "arriving", value: labels.soon };

  const value = duration(remaining);
  return value ? { kind: "arriving_in", value } : { kind: "arriving", value: labels.soon };
};

/** The summary polls itself while a quick order is still in flight (§2.5). */
export const shouldPollOrder = (order: Maybe<Order>) => {
  const status = Number(order?.active_status);
  return isQuickOrder(order) && Number.isFinite(status) && status >= 1 && status <= 5;
};

/**
 * Trap 9: out for delivery is NOT the same as a rider being on it. Under
 * auto-assign an order sits at status 5 with nobody assigned, and opening the
 * map then shows an empty one (§3.6).
 */
export const hasRiderAssigned = (order: Maybe<Order>) => {
  const id = String(order?.delivery_boy_id ?? "").trim();
  if (id && id !== "0") return true;
  // Older payloads carry only the name.
  return Boolean(String(order?.delivery_boy_name ?? "").trim());
};

/** Track opens the map only when the order is out AND somebody has it. */
export const canTrackOrder = (order: Maybe<Order>) =>
  Number(order?.active_status) === 5 && hasRiderAssigned(order);

/** The rider's road time is only worth asking for once they are out with it. */
export const shouldTrackRoute = (order: Maybe<Order>) => Number(order?.active_status) === 5;
