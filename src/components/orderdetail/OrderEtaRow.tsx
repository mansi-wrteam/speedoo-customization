import React from "react";
import { MdOutlineWatchLater } from "react-icons/md";
import { t } from "@/utils/translation";
import type { OrderEta } from "@/utils/orderEta";

export interface OrderEtaRowProps {
  eta: OrderEta | null;
}

/**
 * The ETA line on the order summary (WEB_PARITY_V4.0.2 §2.3).
 *
 * Label on the left, value right-aligned at the row's end, baselines aligned —
 * the old summary parked its values mid-row, so a wrapped label pushed the
 * number somewhere different on every line.
 */
const OrderEtaRow = ({ eta }: OrderEtaRowProps) => {
  if (!eta) return null;

  return (
    <div className="flex flex-col justify-center gap-1 md:items-end">
      <span className="flex items-center gap-1.5 text-sm font-normal leading-5 text-[var(--foreground-tertiary)] md:text-right">
        <MdOutlineWatchLater size={14} />
        {t(eta.kind)}
      </span>
      <p className="text-base font-semibold leading-6 text-[var(--status-success-foreground)] md:text-right">
        {eta.value}
      </p>
    </div>
  );
};

export default OrderEtaRow;
