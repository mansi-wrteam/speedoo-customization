import React from "react";
import { FiTruck } from "react-icons/fi";
import { MdOutlineStorefront } from "react-icons/md";
import { t } from "@/utils/translation";
import type { OrderType } from "@/types/models";

export interface DeliveryModeTabsProps {
  value: OrderType;
  onChange: (value: OrderType) => void;
  /** `doorstep_delivery_mode != 0` */
  doorstepAllowed: boolean;
  /** `self_pickup_mode != 0` */
  pickupAllowed: boolean;
  /** Tapping a mode the shop has switched off explains itself instead of switching. */
  onBlocked: (value: OrderType) => void;
}

/**
 * Delivery / Pickup, as one segmented control at the top of the drawer
 * (WEB_PARITY_V4.0.2 §1.2).
 *
 * Rendered when the shop allows both modes, or neither — with neither, each tab
 * explains itself on tap rather than silently doing nothing. A shop with
 * exactly one mode has nothing to choose, so the caller renders nothing.
 */
const DeliveryModeTabs = ({
  value,
  onChange,
  doorstepAllowed,
  pickupAllowed,
  onBlocked,
}: DeliveryModeTabsProps) => {
  const tabs: { mode: OrderType; label: string; icon: React.ReactNode; allowed: boolean }[] = [
    { mode: "doorstep", label: t("home_delivery"), icon: <FiTruck size={16} />, allowed: doorstepAllowed },
    { mode: "selfpickup", label: t("store_pickup"), icon: <MdOutlineStorefront size={16} />, allowed: pickupAllowed },
  ];

  return (
    <div role="tablist" className="mb-3.5 flex gap-1 rounded-lg bg-[var(--surface-subtle)] p-1">
      {tabs.map((tab) => {
        const active = value === tab.mode;
        return (
          <button
            key={tab.mode}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => (tab.allowed ? onChange(tab.mode) : onBlocked(tab.mode))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[13.5px] font-bold transition-colors ${
              active
                ? "bg-[var(--surface-default)] text-[var(--foreground-primary)] shadow-sm"
                : "text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]"
            } ${tab.allowed ? "" : "opacity-60"}`}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DeliveryModeTabs;
