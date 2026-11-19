import React from "react";
import { BiTrash } from "react-icons/bi";
import { GoPencil } from "react-icons/go";
import { IoHeart } from "react-icons/io5";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { t } from "@/utils/translation";
import type { ApiCartItem } from "@/types/models";

export interface UnavailableItemsCardProps {
  /** Rows whose `status` is the string `"0"` — already split out by the caller. */
  rows: ApiCartItem[];
  favoriteProductIds: Set<string>;
  onReplace: (row: ApiCartItem) => void;
  onRemove: (row: ApiCartItem) => void;
  onClearAll: () => void;
  onMoveToFavorites: (row: ApiCartItem) => void;
  onUnfavorite: (row: ApiCartItem) => void;
  clearing?: boolean;
  busyRowKey?: string | null;
  rowKey: (row: ApiCartItem) => string;
}

/**
 * The sold-out block above the items list (WEB_PARITY_V4.0.2 §1.5).
 *
 * These rows do not count towards the shipment and block Place Order until
 * they are gone, so the block is deliberately loud: error-coloured heading and
 * a dotted "Clear All".
 */
const UnavailableItemsCard = ({
  rows,
  favoriteProductIds,
  onReplace,
  onRemove,
  onClearAll,
  onMoveToFavorites,
  onUnfavorite,
  clearing = false,
  busyRowKey,
  rowKey,
}: UnavailableItemsCardProps) => {
  if (rows.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl bg-[var(--status-error-background)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[13px] font-extrabold text-[var(--status-error-default)]">
          {`${rows.length} ${rows.length === 1 ? t("item_unavailable") : t("items_unavailable")}`}
        </span>
        <button
          type="button"
          onClick={onClearAll}
          disabled={clearing}
          className="text-[12.5px] font-bold text-[var(--status-error-default)] underline decoration-dotted underline-offset-2 disabled:opacity-60"
        >
          {t("clear_all")}
        </button>
      </div>

      <div className="rounded-lg bg-[var(--surface-default)] px-3">
        {rows.map((row) => {
          const name = row?.product?.translations?.name || row?.name || "";
          const isFavorite = favoriteProductIds.has(String(row?.product_id));
          const busy = busyRowKey === rowKey(row);
          return (
            <div
              key={rowKey(row)}
              className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-3 last:border-b-0"
            >
              <div className="h-[46px] w-[46px] flex-shrink-0 overflow-hidden rounded-lg bg-[var(--surface-subtle)] p-1">
                <ImageWithPlaceholder
                  src={row?.image_url}
                  alt={name}
                  width={120}
                  height={120}
                  className="h-full w-full object-cover opacity-60"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-xs font-bold text-[var(--foreground-primary)]">
                  {name}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onReplace(row)}
                    className="flex items-center gap-1 rounded bg-[var(--brand-background-subtle)] px-1.5 py-0.5 text-[11.5px] font-bold text-[var(--brand-foreground-default)]"
                  >
                    <GoPencil size={10} />
                    {t("replace")}
                  </button>
                  {isFavorite ? (
                    <button
                      type="button"
                      onClick={() => onUnfavorite(row)}
                      aria-label={t("removeTowishlist")}
                      className="text-[var(--status-error-default)]"
                    >
                      <IoHeart size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onMoveToFavorites(row)}
                      className="text-[11.5px] font-bold text-[var(--button-link-foreground-default)] underline decoration-dotted underline-offset-2 disabled:opacity-60"
                    >
                      {t("move_to_favorites")}
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRemove(row)}
                disabled={busy}
                aria-label={t("remove")}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--status-error-default)] disabled:opacity-60"
              >
                <BiTrash size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UnavailableItemsCard;
