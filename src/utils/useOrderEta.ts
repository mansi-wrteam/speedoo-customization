// Keeping the order summary's ETA honest while the page sits open
// (WEB_PARITY_V4.0.2 §2.3–§2.5).
//
// A summary that says "Packing" while the rider is at the door is worse than
// none, so this does three things on a timer: recomputes the countdown, asks
// for the rider's road time while they are out with the order, and re-reads
// the order itself.
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import * as api from "@/api/apiRoutes";
import {
  getOrderEta,
  shouldPollOrder,
  shouldTrackRoute,
  type OrderEta,
} from "@/utils/orderEta";
import { t } from "@/utils/translation";
import { ORDER_PUSH_EVENT, type OrderPushDetail } from "@/utils/firebase";
import type { Order } from "@/types/models";
import type { RootState } from "@/types/state";

/** The promise is a fixed number, but "how long is left" changes every minute. */
const ETA_TICK_MS = 30_000;
/** The server caches the route for 10 s; 45 s is the app's refresh. */
const ROUTE_REFRESH_MS = 45_000;
/** Customer pushes are gated by notification settings on the backend, so this is not optional. */
const ORDER_POLL_MS = 60_000;

export interface UseOrderEtaOptions {
  order: Order | null | undefined;
  /** Re-read the order from the server. */
  reload: () => void | Promise<void>;
}

export const useOrderEta = ({ order, reload }: UseOrderEtaOptions) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);
  // Bumped on a tick so the countdown recomputes against the current clock.
  const [, setTick] = useState(0);

  const formats = {
    dateFormat: setting?.date_format,
    timeFormat: setting?.time_format,
  };

  const eta: OrderEta | null = getOrderEta({
    order,
    routeDurationSeconds,
    formats,
    labels: {
      minute: t("minutes"),
      hour: t("hours"),
      soon: t("soon"),
    },
  });

  // Recompute the countdown. Only while something is counting down — a
  // delivered order's "Delivered In" never changes.
  useEffect(() => {
    if (!shouldPollOrder(order)) return;
    const timer = setInterval(() => setTick((value) => value + 1), ETA_TICK_MS);
    return () => clearInterval(timer);
  }, [order]);

  const fetchRoute = useCallback(async () => {
    if (!order?.id) return;
    try {
      const response = await api.getLiveTrackingRoute({ orderId: order.id });
      const duration = Number(response?.data?.route?.duration ?? 0);
      // 0 is the straight-line fallback, not an arrival — fall back to the
      // countdown rather than claiming the rider is here (trap 7).
      setRouteDurationSeconds(duration > 0 ? duration : null);
    } catch (error) {
      console.log("Error", error);
      setRouteDurationSeconds(null);
    }
  }, [order?.id]);

  // The rider's road time, while they are out with it.
  useEffect(() => {
    if (!shouldTrackRoute(order)) {
      setRouteDurationSeconds(null);
      return;
    }
    fetchRoute();
    const timer = setInterval(fetchRoute, ROUTE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchRoute, order]);

  // Re-read the order itself while it is a quick order still in flight.
  useEffect(() => {
    if (!shouldPollOrder(order)) return;
    const timer = setInterval(() => reload(), ORDER_POLL_MS);
    return () => clearInterval(timer);
  }, [order, reload]);

  // A push about THIS order: re-read it at once rather than waiting out the
  // poll. Pushes for other orders are ignored.
  useEffect(() => {
    if (!order?.id) return;
    const onPush = (event: Event) => {
      const pushed = (event as CustomEvent<OrderPushDetail>).detail?.orderId;
      if (pushed == null || String(pushed) === String(order.id)) reload();
    };
    window.addEventListener(ORDER_PUSH_EVENT, onPush);
    return () => window.removeEventListener(ORDER_PUSH_EVENT, onPush);
  }, [order?.id, reload]);

  // Pushes that land while the tab is in the background never reach an open
  // screen, so coming back to it has to re-read.
  useEffect(() => {
    if (!shouldPollOrder(order)) return;
    const refresh = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [order, reload]);

  return { eta };
};
