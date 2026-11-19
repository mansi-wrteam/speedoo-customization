import React from "react";
import { t } from "@/utils/translation";
import type { Url } from "@/types/common";
import type { Order, OrderItem } from "@/types/models";

/** Prescription images uploaded together, and the names of the items they cover. */
interface OrderPrescriptionGroup {
  images: Url[];
  products: string[];
}

export interface OrderPrescriptionsProps {
  orderDetail: Order;
}

// Rebuild prescription groups from the order items: items that share the same
// prescription image(s) were uploaded together as one group at checkout.
// Returns [{ images: [url...], products: [name...] }].
const buildGroups = (items: OrderItem[] | undefined): OrderPrescriptionGroup[] => {
  const map = new Map<string, OrderPrescriptionGroup>();
  (items || []).forEach((item) => {
    const urls = item?.prescriptions || [];
    if (!urls.length) return;
    const key = [...urls].sort().join("|");
    if (!map.has(key)) map.set(key, { images: urls, products: [] });
    const name = item?.name || `#${item?.product_variant_id}`;
    if (!map.get(key)!.products.includes(name)) {
      map.get(key)!.products.push(name);
    }
  });
  return [...map.values()];
};

const OrderPrescriptions = ({ orderDetail }: OrderPrescriptionsProps) => {
  const groups = buildGroups(orderDetail?.items);
  if (!groups.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">{t("prescriptions")}</h1>
      <div className="flex flex-col gap-4 rounded-2xl p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
        {groups.map((group, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-[var(--border-subtle)] border-l-4 border-l-[var(--brand-foreground-default)] p-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap bg-[var(--brand-background-default)] text-[var(--brand-foreground-inverse)]">
                {t("group")} {idx + 1}
              </span>
              <div className="text-[11px] text-[var(--foreground-tertiary)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>
                  {t("covers")} {group.products.length}:
                </span>
                {group.products.map((name, i) => (
                  <span key={i} className="whitespace-nowrap">
                    • {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {group.images.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-20 h-20 rounded-lg border border-[var(--border-subtle)] overflow-hidden hover:opacity-90 transition"
                  title={t("view")}
                >
                  <img
                    src={url}
                    alt="prescription"
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderPrescriptions;
