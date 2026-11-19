import React from "react";
import { MdOutlineWatchLater } from "react-icons/md";
import { t } from "@/utils/translation";
import { formatSlotDuration } from "@/utils/timeSlotUtils";
import type { TimeSlot } from "@/types/models";

export interface QuickDeliveryCardProps {
  slot?: TimeSlot | null;
  /** Units across the cart (getShipmentItemCount). */
  itemCount?: number;
}

// Quick Delivery summary (WEB_PARITY_V4.0.1 §2.3). Replaces the day strip and
// slot rows entirely — a Quick module has nothing to choose.
const QuickDeliveryCard = ({ slot, itemCount }: QuickDeliveryCardProps) => {
  const duration = formatSlotDuration(slot?.duration_minutes, {
    minute: t("minutes"),
    hour: t("hours"),
  });

  return (
    <div className="flex items-center gap-3 rounded-2xl p-4 bg-[var(--surface-default)] border border-[var(--border-subtle)]">
      <span
        className="flex items-center justify-center rounded-lg p-2 bg-[var(--status-success-background)] text-[var(--status-success-foreground)]"
        style={{ boxShadow: "0 12px 12px rgba(0,0,0,0.04)" }}
      >
        <MdOutlineWatchLater size={24} />
      </span>
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="text-base font-semibold text-[var(--foreground-primary)]">
          {t("delivered_in")} -{" "}
          <span className="text-[var(--status-success-foreground)]">{duration}</span>
        </h3>
        <p className="text-sm font-medium text-[var(--foreground-secondary)] opacity-80">
          {t("shipment_of_items").replace(
            "{n}",
            // replace() stringifies the number at runtime; its lib typing only accepts a string.
            (itemCount as unknown as string) ?? (0 as unknown as string),
          )}
        </p>
      </div>
    </div>
  );
};

export default QuickDeliveryCard;
