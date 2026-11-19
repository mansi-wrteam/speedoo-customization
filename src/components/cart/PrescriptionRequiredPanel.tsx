import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiUpload, FiPlus } from "react-icons/fi";
import { BiTrash } from "react-icons/bi";
import { t } from "@/utils/translation";
import { removeImageFromGroup } from "@/redux/slices/checkoutSlice";
import { getUncoveredRequiredVariantIds } from "@/utils/prescriptionGroups";
import { deleteImage } from "@/utils/prescriptionImageStore";
import {
  usePrescriptionUpload,
  MAX_IMAGES_PER_GROUP,
} from "@/utils/usePrescriptionUpload";
import PrescriptionUploadModal from "./PrescriptionUploadModal";
import PrescriptionImageThumb from "./PrescriptionImageThumb";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id } from "@/types/common";
import type { ApiCartItem } from "@/types/models";

export interface PrescriptionRequiredPanelProps {
  /** Cart rows shown on the page / drawer (server rows, or guest rows from `expandGuestRows`). */
  cartProductsData: ApiCartItem[] | null | undefined;
  /** Cart drawer layout: capped scroll list, no inline "add images" button or file input. */
  compact?: boolean;
}

const formatSize = (bytes: number | undefined) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Cart-side prescription card: shows coverage (covered/required), the
// prescriptions already uploaded, and the button that opens the upload modal.
// Item selection lives in the modal — cart lines no longer carry checkboxes.
const PrescriptionRequiredPanel = ({ cartProductsData, compact = false }: PrescriptionRequiredPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const groups = useSelector((state: RootState) => state.Checkout.prescriptionGroups);
  // Prescription upload requires login (image files can't be persisted for
  // guests). Guests see a "login to upload" prompt; they log in at checkout.
  const isLoggedIn = useSelector((state: RootState) => !!state.User?.jwtToken);

  const [showModal, setShowModal] = useState(false);
  const { openFilePicker, fileInputProps } = usePrescriptionUpload();

  const nameOf = (variantId: Id) =>
    cartProductsData?.find((p) => p?.product_variant_id == variantId)?.product
      ?.translations?.name || `#${variantId}`;

  const requiredCount = (cartProductsData || []).filter(
    (p) => p?.require_prescription == 1
  ).length;
  const uncovered = getUncoveredRequiredVariantIds(cartProductsData, groups);
  const coveredRequired = requiredCount - uncovered.length;

  const uploadButton = (
    <button
      type="button"
      onClick={() => setShowModal(true)}
      className="flex w-full sm:w-auto items-center justify-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
    >
      {t("upload_prescription")}
      <FiUpload size={16} />
    </button>
  );

  return (
    <div
      className={`flex w-full flex-col overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] ${
        compact ? "min-h-0" : ""
      }`}
    >
      {/* Header with coverage counter */}
      <div className="flex flex-shrink-0 items-center gap-6 bg-[var(--surface-subtle)] p-4">
        <p className="flex-1 text-base font-medium leading-6 text-[var(--foreground-primary)]">
          {t("prescription_required")}
        </p>
        <p className="text-base font-medium leading-6 text-[var(--brand-background-default)]">
          {coveredRequired}/{requiredCount}
        </p>
      </div>

      {!isLoggedIn ? (
        <p className="p-4 text-sm font-medium leading-5 text-[var(--foreground-tertiary)]">
          {t("login_to_upload_prescription")}
        </p>
      ) : (
        <>
          {/* Uploaded prescriptions — in the cart drawer this list sits in a
              sticky footer, so it scrolls within a cap instead of growing the
              footer until the drawer itself can no longer scroll. */}
          {groups?.length > 0 && (
            <div
              className={`flex flex-col gap-4 p-4 ${
                compact ? "min-h-0 flex-1 overflow-y-auto" : ""
              }`}
            >
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col gap-4 rounded-2xl p-3 sm:p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
                >
                  {group.images?.map((img, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="flex flex-1 items-center gap-3 min-w-0">
                        <div className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden">
                          <PrescriptionImageThumb src={img.preview} />
                        </div>
                        <div className="flex flex-1 flex-col gap-1 min-w-0">
                          <p className="line-clamp-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                            {/* `file` is the picked File; the type also allows the Blob restored from IndexedDB. */}
                            {img?.name ?? (img?.file as File | undefined)?.name}
                          </p>
                          <p className="text-sm font-medium leading-5">
                            <span className="text-[var(--status-success-foreground)]">
                              {t("uploaded")}
                            </span>
                            <span className="text-[var(--foreground-tertiary)]">
                              {" · "}
                              {formatSize(img?.size ?? img?.file?.size)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (img?.imageId) deleteImage(img.imageId);
                          dispatch(
                            removeImageFromGroup({ id: group.id, index: i })
                          );
                        }}
                        className="flex flex-shrink-0 items-center justify-center rounded-lg bg-[var(--button-destructive-background-default)] p-2 text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-destructive-background-hover)]"
                      >
                        <BiTrash size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="h-px w-full bg-[var(--border-default)]" />
                  <div className="flex w-full flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-medium leading-5 text-[var(--foreground-tertiary)]">
                        {t("covers")} :
                      </span>
                      {group.productIds?.map((id) => (
                        <span
                          key={id}
                          className="flex items-center justify-center rounded-full bg-[var(--status-success-background)] px-4 py-2 text-xs font-bold leading-4 text-[var(--status-success-foreground)]"
                        >
                          {nameOf(id)}
                        </span>
                      ))}
                    </div>
                    {/* Drawer (compact) keeps this out — its sticky footer has
                        no room to grow; there the modal is the way to add. */}
                    {!compact && (
                      <button
                        type="button"
                        disabled={
                          (group.images?.length || 0) >= MAX_IMAGES_PER_GROUP
                        }
                        onClick={() => openFilePicker(group.id)}
                        className="flex flex-shrink-0 items-center justify-center gap-1 rounded-lg px-4 py-2 text-sm font-medium leading-5 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <FiPlus size={16} />
                        {t("add_images")}
                        <span className="text-[var(--foreground-tertiary)]">
                          {`${group.images?.length || 0}/${MAX_IMAGES_PER_GROUP}`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload action — gets its own bordered footer once groups exist */}
          <div
            className={`flex flex-shrink-0 flex-col items-start justify-center p-4 ${
              groups?.length > 0 ? "border-t border-[var(--border-subtle)]" : ""
            }`}
          >
            {uploadButton}
          </div>
        </>
      )}

      {!compact && <input {...fileInputProps} />}

      <PrescriptionUploadModal
        open={showModal}
        onClose={() => setShowModal(false)}
        cartProductsData={cartProductsData}
      />
    </div>
  );
};

export default PrescriptionRequiredPanel;
