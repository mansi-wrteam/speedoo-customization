import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { t } from "@/utils/translation";
import { isSlotClosed } from "@/utils/timeSlotUtils";
import type { TimeSlot } from "@/types/models";

export interface PreferredDeliveryModalProps {
  open: boolean;
  onClose: () => void;
  /** Slots for the chosen day, `isDisabled` already computed. */
  slots: TimeSlot[];
  selectedDate: string | null;
  selectedSlot: TimeSlot | null;
  onSelectDate: (date: Date) => void;
  onSelectSlot: (slot: TimeSlot) => void;
  /** `delivery_estimate_days`, parsed; counts today as day 1. */
  estimateDays: number;
  /** How many days ahead the admin allows. */
  allowedDays: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Preferred Delivery (WEB_PARITY_V4.0.2 §1.2): pick a day, then a slot.
 *
 * The day strip scrolls rather than assuming the admin's day count fits —
 * `time_slots_allowed_days` can be 15 or more. Nav buttons and edge fades make
 * that scrollability visible instead of leaving it to be discovered.
 */
const PreferredDeliveryModal = ({
  open,
  onClose,
  slots,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
  estimateDays,
  allowedDays,
}: PreferredDeliveryModalProps) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // The first bookable day. A Quick module omits `delivery_estimate_days`, and
  // the missing value must mean today, never −1 (§2.1, trap 3).
  const firstDayOffset = estimateDays > 1 ? estimateDays - 1 : 0;
  const days = Array.from({ length: Math.max(allowedDays, 1) }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + firstDayOffset + index);
    return date;
  });
  const chosen = selectedDate ? new Date(selectedDate) : null;

  const updateNavState = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    setAtStart(strip.scrollLeft <= 2);
    setAtEnd(strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2);
  }, []);

  // Widths are 0 while the modal is closed, so only measure once it is visible.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(updateNavState);
    return () => cancelAnimationFrame(frame);
  }, [open, updateNavState]);

  const scrollDays = (direction: 1 | -1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const chip = strip.querySelector<HTMLElement>("[data-day-chip]");
    const step = chip ? (chip.offsetWidth + 8) * 3 : 180;
    strip.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="flex w-[420px] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
          <DialogTitle className="text-[19px] font-extrabold text-[var(--foreground-primary)]">
            {t("preferred_day_and_time")}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--foreground-secondary)]"
          >
            <RiCloseFill size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 pb-1 pt-5">
          <p className="mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--foreground-tertiary)]">
            {t("preferred_delivery_day")}
          </p>

          <div className="relative mb-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollDays(-1)}
              disabled={atStart}
              aria-label={t("previous")}
              className="z-10 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-default)] text-[var(--foreground-secondary)] outline outline-1 -outline-offset-1 outline-[var(--border-default)] disabled:opacity-30"
            >
              <MdChevronLeft size={14} />
            </button>

            <div
              ref={stripRef}
              onScroll={updateNavState}
              className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {days.map((date) => {
                const active = chosen ? sameDay(date, chosen) : false;
                const isToday = sameDay(date, new Date());
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    data-day-chip
                    onClick={() => onSelectDate(date)}
                    className={`w-[50px] flex-shrink-0 snap-start rounded-lg py-2 text-center outline outline-1 -outline-offset-1 transition-colors ${
                      active
                        ? "bg-[var(--brand-background-subtle)] outline-[var(--brand-foreground-default)]"
                        : "bg-[var(--surface-default)] outline-[var(--border-default)]"
                    }`}
                  >
                    <span
                      className={`block text-[10.5px] font-bold ${
                        active
                          ? "text-[var(--brand-foreground-default)]"
                          : "text-[var(--foreground-tertiary)]"
                      }`}
                    >
                      {isToday ? t("today") : DAY_NAMES[date.getDay()]}
                    </span>
                    <span
                      className={`block text-sm font-extrabold ${
                        active
                          ? "text-[var(--brand-foreground-default)]"
                          : "text-[var(--foreground-primary)]"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollDays(1)}
              disabled={atEnd}
              aria-label={t("next")}
              className="z-10 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-default)] text-[var(--foreground-secondary)] outline outline-1 -outline-offset-1 outline-[var(--border-default)] disabled:opacity-30"
            >
              <MdChevronRight size={14} />
            </button>
          </div>

          <p className="mb-2.5 mt-4 text-[11px] font-extrabold uppercase tracking-wider text-[var(--foreground-tertiary)]">
            {t("preferred_delivery_time")}
          </p>

          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const active = selectedSlot?.id == slot?.id;
              // last_order_time: null means the slot never closes; past its
              // cut-off it must not be selectable.
              const closed = slot.isDisabled == true || isSlotClosed(slot, selectedDate);
              return (
                <button
                  key={slot?.id}
                  type="button"
                  disabled={closed}
                  onClick={() => onSelectSlot(slot)}
                  className={`min-w-[30%] flex-1 rounded-lg px-1 py-2.5 text-center text-xs font-extrabold outline outline-1 -outline-offset-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? "bg-[var(--brand-background-subtle)] text-[var(--brand-foreground-default)] outline-[var(--brand-foreground-default)]"
                      : "bg-[var(--surface-default)] text-[var(--foreground-primary)] outline-[var(--border-default)]"
                  }`}
                >
                  {slot?.translations?.title || slot?.default_title}
                  {slot?.is_free_delivery ? (
                    <span className="mt-0.5 block text-[10px] font-semibold text-[var(--status-success-foreground)]">
                      {t("freedelivery")}
                    </span>
                  ) : null}
                </button>
              );
            })}
            {slots.length === 0 && (
              <p className="py-4 text-center text-[13px] text-[var(--foreground-tertiary)]">
                {t("all_timeslots_over")}
              </p>
            )}
          </div>
        </div>

        <div className="p-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[var(--button-primary-background-default)] py-3 text-sm font-bold text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
          >
            {t("confirm")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreferredDeliveryModal;
