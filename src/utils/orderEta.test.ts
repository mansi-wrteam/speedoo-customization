import { describe, expect, it } from "vitest";
import {
  canTrackOrder,
  deliveredInMinutes,
  getOrderEta,
  isQuickOrder,
  shouldPollOrder,
} from "./orderEta";
import type { Order } from "@/types/models";

const labels = { minute: "Minutes", hour: "Hours", soon: "Soon" };
const at = (iso: string) => new Date(iso);

const order = (fields: Partial<Order>) =>
  ({ id: 1, delivery_minutes: 10, ...fields }) as Order;

/** Placed at 10:00 UTC; `created_at` is the ISO field. */
const placed = "2026-10-08T10:00:00Z";

describe("isQuickOrder", () => {
  it("is a quick order only with a positive delivery_minutes", () => {
    expect(isQuickOrder(order({ delivery_minutes: 10 }))).toBe(true);
    expect(isQuickOrder(order({ delivery_minutes: "15" }))).toBe(true);
    expect(isQuickOrder(order({ delivery_minutes: 0 }))).toBe(false);
    expect(isQuickOrder({ id: 1, estimate_date: "12-10-2026" } as Order)).toBe(false);
  });
});

describe("getOrderEta", () => {
  it("shows the promise while payment is pending", () => {
    expect(
      getOrderEta({
        order: order({ active_status: 1, created_at: placed }),
        labels,
        now: at("2026-10-08T10:05:00Z"),
      })
    ).toEqual({ kind: "delivery_in", value: "10 Minutes" });
  });

  it("counts down once the order is moving, rounding up", () => {
    expect(
      getOrderEta({
        order: order({ active_status: 3, created_at: placed }),
        labels,
        now: at("2026-10-08T10:04:30Z"),
      })
    ).toEqual({ kind: "arriving_in", value: "6 Minutes" });
  });

  // Trap 4: the promise is not a measurement. Past it, never 0 and never
  // negative.
  it("says Soon once the countdown runs out", () => {
    expect(
      getOrderEta({
        order: order({ active_status: 4, created_at: placed }),
        labels,
        now: at("2026-10-08T10:30:00Z"),
      })
    ).toEqual({ kind: "arriving", value: "Soon" });
  });

  it("prefers the rider's road time when out for delivery", () => {
    expect(
      getOrderEta({
        order: order({ active_status: 5, created_at: placed }),
        routeDurationSeconds: 380,
        labels,
        now: at("2026-10-08T10:02:00Z"),
      })
    ).toEqual({ kind: "arriving_in", value: "7 Minutes" });
  });

  // Trap 7: duration 0 is the straight-line fallback, not an arrival.
  it("falls back to the countdown when there is no road route", () => {
    expect(
      getOrderEta({
        order: order({ active_status: 5, created_at: placed }),
        routeDurationSeconds: 0,
        labels,
        now: at("2026-10-08T10:02:00Z"),
      })
    ).toEqual({ kind: "arriving_in", value: "8 Minutes" });
  });

  it("reports what delivery actually took, folding whole hours", () => {
    expect(
      getOrderEta({
        order: order({
          active_status: 6,
          date: "08-10-2026 10:00 AM",
          status: [
            [2, "08-10-2026 10:01 AM"],
            [6, "08-10-2026 10:23 AM"],
          ],
        }),
        labels,
        formats: { dateFormat: "d-m-Y", timeFormat: "h:i A" },
      })
    ).toEqual({ kind: "delivered_in", value: "23 Minutes" });

    expect(
      deliveredInMinutes(
        order({
          date: "08-10-2026 10:00 AM",
          status: [[6, "08-10-2026 12:00 PM"]],
        }),
        { dateFormat: "d-m-Y", timeFormat: "h:i A" }
      )
    ).toBe(120);
  });

  it("hides itself for cancelled and returned orders", () => {
    for (const active_status of [7, 8]) {
      expect(getOrderEta({ order: order({ active_status, created_at: placed }), labels })).toBeNull();
    }
  });

  it("hides itself when a delivered order has no code-6 entry", () => {
    expect(
      getOrderEta({ order: order({ active_status: 6, date: "08-10-2026" }), labels })
    ).toBeNull();
  });

  it("shows nothing for a fixed-window order", () => {
    expect(
      getOrderEta({
        order: { id: 1, active_status: 3, estimate_date: "12-10-2026" } as Order,
        labels,
      })
    ).toBeNull();
  });
});

describe("shouldPollOrder", () => {
  it("polls a quick order that is still in flight", () => {
    expect(shouldPollOrder(order({ active_status: 1 }))).toBe(true);
    expect(shouldPollOrder(order({ active_status: 5 }))).toBe(true);
    expect(shouldPollOrder(order({ active_status: 6 }))).toBe(false);
    expect(shouldPollOrder({ id: 1, active_status: 3 } as Order)).toBe(false);
  });
});

describe("canTrackOrder", () => {
  // Trap 9: under auto-assign an order sits at status 5 with nobody on it,
  // and the map would open empty.
  it("needs the order out AND a rider on it", () => {
    expect(canTrackOrder({ id: 1, active_status: 5, delivery_boy_id: 9 } as Order)).toBe(true);
    expect(canTrackOrder({ id: 1, active_status: 5, delivery_boy_id: "0" } as Order)).toBe(false);
    expect(canTrackOrder({ id: 1, active_status: 5, delivery_boy_id: "" } as Order)).toBe(false);
    expect(canTrackOrder({ id: 1, active_status: 5 } as Order)).toBe(false);
    expect(canTrackOrder({ id: 1, active_status: 4, delivery_boy_id: 9 } as Order)).toBe(false);
  });

  it("falls back to the rider's name on older payloads", () => {
    expect(
      canTrackOrder({ id: 1, active_status: 5, delivery_boy_name: "Asha" } as Order)
    ).toBe(true);
  });
});
