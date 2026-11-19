import ImageWithPlaceholder from "@/components/image-with-placeholder/ImageWithPlaceholder";
import { t } from "@/utils/translation";
import React from "react";
import type { RequestedProduct, RequestedProductStatus } from "@/types/models";

export interface RequestProductCardProps {
  request: RequestedProduct;
}

// Request status -> label key and status tone, matching the tones used by
// OrderStatusBadge so every status chip in the dashboard reads the same.
const STATUS: Record<RequestedProductStatus, { label: string; className: string }> = {
  pending: {
    label: "pending",
    className:
      "bg-[var(--status-warning-background)] text-[var(--status-warning-foreground)] outline-[var(--status-warning-border)]",
  },
  rejected: {
    label: "rejected",
    className:
      "bg-[var(--status-error-background)] text-[var(--status-error-foreground)] outline-[var(--status-error-border)]",
  },
  approved: {
    label: "approved",
    className:
      "bg-[var(--status-success-background)] text-[var(--status-success-foreground)] outline-[var(--status-success-border)]",
  },
};

const RequestProductCard = ({ request }: RequestProductCardProps) => {
  const status = STATUS[request?.status as RequestedProductStatus] ?? STATUS.approved;

  return (
    // min-h + h-full keep every card the same height whether or not it carries a
    // rejection reason; the clamps below stop long text from growing the card.
    <div className="flex h-full min-h-[164px] flex-col gap-3 rounded-lg p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
      <div className="flex flex-1 items-start gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
          <ImageWithPlaceholder
            src={request?.image_url}
            alt="Requested product image"
            className="h-full w-full rounded object-cover"
            height={500}
            width={500}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
              {request?.created_at}
            </p>
            <span
              className={`shrink-0 rounded-lg px-2 py-1 text-center text-sm font-semibold leading-5 outline outline-1 -outline-offset-1 ${status.className}`}
            >
              {t(status.label)}
            </span>
          </div>

          {request?.description && (
            <p
              className="line-clamp-2 break-words text-base font-normal leading-6 text-[var(--foreground-primary)]"
              title={request?.description}
            >
              {request?.description}
            </p>
          )}
        </div>
      </div>

      {request?.admin_notes && (
        <div className="flex items-baseline gap-2 rounded-lg bg-[var(--status-error-background)] px-3 py-2 outline outline-1 -outline-offset-1 outline-[var(--status-error-border)]">
          <h3 className="shrink-0 text-sm font-semibold leading-5 text-[var(--status-error-foreground)]">
            {t("rejectedReason")}:
          </h3>
          <p
            className="line-clamp-1 min-w-0 flex-1 break-words text-sm font-normal leading-5 text-[var(--foreground-secondary)]"
            title={request?.admin_notes}
          >
            {request?.admin_notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default RequestProductCard;
