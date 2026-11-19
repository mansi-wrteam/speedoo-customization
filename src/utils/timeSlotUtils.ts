// Delivery time-slot rules (WEB_PARITY_V4.0.1 §2).
//
// The admin picks one of two modes per module:
//   Enable Time Slots off  → no picker at all
//   on + "Fixed Time Window" → day picker + slot list
//   on + "Quick Delivery"    → one duration, no day picker
import type { TimeSlot } from "@/types/models/misc";

type Maybe<T> = T | null | undefined;
type SlotDate = Maybe<Date | string | number>;

// `time_slots_is_enabled` is the string "1" when on and the number 0 when off,
// so compare as a string.
export const isTimeSlotsEnabled = (data: Maybe<{ time_slots_is_enabled?: unknown }>) =>
  String(data?.time_slots_is_enabled) === "1";

// Whether checkout shows the delivery day/slot section (and asks for a date).
// Older backends sent `time_slot_setting` ("true"/"false"); since admin 2.1.3
// the time_slots response no longer has it, only `time_slots_is_enabled`, so
// fall back to that (modes above). Without this the section never showed.
export const showsDeliverySchedule = (
  data: Maybe<{ time_slot_setting?: unknown; time_slots_is_enabled?: unknown }>
) =>
  data?.time_slot_setting != null
    ? String(data.time_slot_setting) === "true"
    : isTimeSlotsEnabled(data);

export const isExpressSlot = (slot: Maybe<Pick<TimeSlot, "slot_type">>) => slot?.slot_type === "express";

// Branch on the slots themselves, never on the module id: a module whose slots
// are all express is a Quick Delivery module.
export const isQuickDelivery = (slots: TimeSlot[] = []) =>
  slots.length > 0 && slots.every(isExpressSlot);

// A slot with `last_order_time: null` never closes. Otherwise it is hidden once
// the current time passes its cut-off — and only on the day it belongs to, so
// tomorrow's 9am slot is still open at 6pm today.
export const isSlotClosed = (slot: Maybe<Pick<TimeSlot, "last_order_time">>, selectedDate?: SlotDate) => {
  if (!slot?.last_order_time) return false;
  const now = new Date();
  const chosen = new Date(selectedDate || Date.now());
  if (chosen.toDateString() !== now.toDateString()) return false;
  const [hours, minutes, seconds] = String(slot.last_order_time)
    .split(":")
    .map(Number);
  const cutoff = new Date(chosen);
  cutoff.setHours(hours || 0, minutes || 0, seconds || 0, 0);
  return now >= cutoff;
};

// Quick with exactly one express slot has nothing to choose — just the summary.
export const getQuickSlot = (slots: TimeSlot[] = []): TimeSlot | null =>
  isQuickDelivery(slots) ? slots[0] : null;

// The same slot, but only while it is still open. Express slots are not always
// open-ended in practice (a live module carries last_order_time 19:00:00), and
// promising 15-minute delivery past the cut-off would be a lie.
export const getAvailableQuickSlot = (slots: TimeSlot[] = [], selectedDate?: SlotDate) => {
  const slot = getQuickSlot(slots);
  return slot && !isSlotClosed(slot, selectedDate) ? slot : null;
};

// Fold whole hours: 15 → "15 Minutes", 1200 → "20 Hours", 90 stays
// "90 Minutes". Never print "1200 Minutes".
export const formatSlotDuration = (minutes: unknown, labels: { minute?: string; hour?: string } = {}) => {
  const mins = Number(minutes);
  if (!mins || Number.isNaN(mins)) return "";
  const { minute = "Minutes", hour = "Hours" } = labels;
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60} ${hour}`;
  return `${mins} ${minute}`;
};

// "Shipment of N items" is not in any checkout API — sum qty across the cart
// lines. Units, not lines: two of one pizza is 2.
export const getShipmentItemCount = (cartLines: { qty?: unknown }[] = []) =>
  cartLines.reduce((sum, line) => sum + (Number(line?.qty) || 0), 0);
