import React from "react";
import { IoLocationOutline } from "react-icons/io5";
import { GoPlus } from "react-icons/go";
import { BiEditAlt } from "react-icons/bi";
import { FiNavigation } from "react-icons/fi";
import { t } from "@/utils/translation";
import type { Numeric } from "@/types/common";
import type { Address, OrderType, SellerSelfPickup } from "@/types/models";

export interface CheckoutAddressHeaderProps {
  orderType: OrderType;
  address: Address | null;
  pickup?: SellerSelfPickup | null;
  /** Opens the address picker for the held address. */
  onEdit: () => void;
  /** Opens the address form with nothing prefilled. */
  onAdd: () => void;
}

/**
 * "12 MG Road, Area, City, 395007" — blank parts dropped, and parts the line
 * already contains dropped too.
 *
 * A pin dropped on the map fills `address` with the whole formatted address
 * from geocoding ("47, Mirzapar Hwy, Uma Nagar, Bhuj, Gujarat 370040, India"),
 * and `area`, `city` and `pincode` then repeat pieces of it. Appending them
 * blindly produced three wrapped lines that said Bhuj twice.
 */
export const formatAddressLine = (address: Address | null | undefined) => {
  const parts = [address?.address, address?.area, address?.city, address?.pincode]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean);

  return parts
    .reduce<string[]>((kept, part) => {
      const alreadySaid = kept.join(", ").toLowerCase();
      if (alreadySaid.includes(part.toLowerCase())) return kept;
      kept.push(part);
      return kept;
    }, [])
    .join(", ");
};

/**
 * Opens the pin in Google Maps. Always this `search` form — a `maps?q=` link
 * resolves to a place page on some clients, which is not what "Direct Me"
 * promises (WEB_PARITY_V4.0.2 §1.2).
 */
export const pickupMapsUrl = (lat: Numeric | undefined, lng: Numeric | undefined) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** Delivering-to / Pickup-from row under the mode toggle (§1.2). */
const CheckoutAddressHeader = ({
  orderType,
  address,
  pickup,
  onEdit,
  onAdd,
}: CheckoutAddressHeaderProps) => {
  if (orderType === "selfpickup") {
    const hasPin = pickup?.pickup_latitude != null && pickup?.pickup_longitude != null;
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-[var(--surface-subtle)] px-4 py-3.5">
        <span className="text-xs font-semibold text-[var(--foreground-tertiary)]">
          {t("pickup_from")}
        </span>
        <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-[var(--foreground-primary)]">
          {pickup?.seller_name}
          {pickup?.pickup_store_address ? ` — ${pickup.pickup_store_address}` : ""}
        </span>
        {pickup?.opening_time && (
          <span className="text-[12.5px] text-[var(--foreground-tertiary)]">
            {`${t("today")} · ${pickup.opening_time} – ${pickup?.closing_time ?? ""}`}
          </span>
        )}
        {hasPin && (
          <a
            href={pickupMapsUrl(pickup?.pickup_latitude, pickup?.pickup_longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--surface-default)] px-3 py-2 text-[12.5px] font-bold text-[var(--foreground-primary)] outline outline-1 -outline-offset-1 outline-[var(--border-default)]"
          >
            <FiNavigation size={13} />
            {t("direct_me")}
          </a>
        )}
      </div>
    );
  }

  if (!address) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-subtle)] px-4 py-3.5">
        <IoLocationOutline size={16} className="flex-shrink-0 text-[var(--brand-foreground-default)]" />
        <span className="flex-1 truncate text-[13.5px] font-semibold text-[var(--foreground-primary)]">
          {t("add_new_address")}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="flex flex-shrink-0 items-center gap-1 text-[12.5px] font-bold text-[var(--button-link-foreground-default)]"
        >
          <GoPlus size={13} />
          {t("add")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl bg-[var(--surface-subtle)] px-4 py-3.5">
      <IoLocationOutline size={16} className="mt-0.5 flex-shrink-0 text-[var(--brand-foreground-default)]" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-semibold text-[var(--foreground-tertiary)]">
          {t("delivering_to")}
        </span>
        <span
          title={formatAddressLine(address)}
          className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-[var(--foreground-primary)]"
        >
          {formatAddressLine(address)}
        </span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-shrink-0 items-center gap-1 text-[12.5px] font-bold text-[var(--button-link-foreground-default)]"
      >
        <BiEditAlt size={13} />
        {t("edit")}
      </button>
    </div>
  );
};

export default CheckoutAddressHeader;
