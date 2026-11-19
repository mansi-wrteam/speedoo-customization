import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { FiInfo, FiUpload, FiCheck, FiPlus } from "react-icons/fi";
import { BiTrash } from "react-icons/bi";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import PrescriptionImageThumb from "./PrescriptionImageThumb";
import { KigenCheckbox } from "@/components/common/KigenControls";
import { t } from "@/utils/translation";
import {
  removeImageFromGroup,
  togglePrescriptionSelection,
  clearPrescriptionSelection,
} from "@/redux/slices/checkoutSlice";
import {
  findGroupForVariant,
  getUncoveredRequiredVariantIds,
} from "@/utils/prescriptionGroups";
import { deleteImage } from "@/utils/prescriptionImageStore";
import {
  usePrescriptionUpload,
  MAX_IMAGES_PER_GROUP,
} from "@/utils/usePrescriptionUpload";
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Id } from "@/types/common";
import type { ApiCartItem } from "@/types/models";

const formatSize = (bytes: number | undefined) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface StatusPillProps {
  tone: "warning" | "information" | "success";
  children: React.ReactNode;
  size?: "sm" | "xs";
}

// Status pill (Required / Optional / Covers chip).
const StatusPill = ({ tone, children, size = "sm" }: StatusPillProps) => {
  const tones = {
    warning:
      "bg-[var(--status-warning-background)] text-[var(--status-warning-foreground)]",
    information:
      "bg-[var(--status-information-background)] text-[var(--status-information-foreground)]",
    success:
      "bg-[var(--status-success-background)] text-[var(--status-success-foreground)]",
  };
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full px-4 py-2 ${
        size === "xs"
          ? "text-xs font-bold leading-4"
          : "text-sm font-semibold leading-5"
      } ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

export interface PrescriptionUploadModalProps {
  open: boolean;
  onClose: () => void;
  /** Cart rows from the parent panel; each row is a selectable medicine. */
  cartProductsData: ApiCartItem[] | null | undefined;
}

// Prescription upload flow. Selection now happens here (inside the modal)
// instead of on each cart line: tick the medicines that share one prescription,
// upload the image once, repeat for a second prescription if needed.
const PrescriptionUploadModal = ({ open, onClose, cartProductsData }: PrescriptionUploadModalProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const groups = useSelector((state: RootState) => state.Checkout.prescriptionGroups);
  const selected = useSelector(
    (state: RootState) => state.Checkout.selectedPrescriptionProductIds
  );
  const { openFilePicker, fileInputProps } = usePrescriptionUpload();

  const nameOf = (variantId: Id) =>
    cartProductsData?.find((p) => p?.product_variant_id == variantId)?.product
      ?.translations?.name || `#${variantId}`;

  const requiredCount = (cartProductsData || []).filter(
    (p) => p?.require_prescription == 1
  ).length;
  const uncovered = getUncoveredRequiredVariantIds(cartProductsData, groups);
  const allCovered = requiredCount > 0 && uncovered.length === 0;

  const handleClose = () => {
    dispatch(clearPrescriptionSelection());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex w-[900px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] sm:max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-[var(--surface-default)] p-0 shadow-lg">
        {/* Header — p-4, 1px Border-Default rule */}
        <div className="flex flex-shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-[var(--border-default)] p-4">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <h2 className="text-lg sm:text-xl font-semibold leading-7 text-[var(--foreground-primary)]">
              {t("upload_prescription")}
            </h2>
            <p className="text-sm sm:text-base font-normal leading-5 sm:leading-6 text-[var(--foreground-tertiary)]">
              {allCovered
                ? t("all_prescriptions_uploaded")
                : `${uncovered.length} ${t(
                    "required_prescriptions_still_needed"
                  )}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex flex-shrink-0 items-center justify-center gap-1 rounded-lg p-2 sm:p-3 text-[var(--button-link-foreground-default)] transition-colors hover:text-[var(--button-link-foreground-hover)]"
          >
            <RiCloseFill size={24} />
          </button>
        </div>

        {/* Body — scrolls on its own; min-h-0 lets it shrink inside the flex column */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 sm:gap-8 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Hint banner */}
            <div className="flex items-start gap-6 rounded-2xl bg-[var(--status-information-background)] p-4 outline outline-1 -outline-offset-1 outline-[var(--status-information-border)]">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <FiInfo
                  size={24}
                  className="flex-shrink-0 text-[var(--status-information-foreground)]"
                />
                <p className="min-w-0 flex-1 text-sm sm:text-base font-normal leading-5 sm:leading-6 text-[var(--foreground-secondary)]">
                  {t("prescription_hint_before")}{" "}
                  <span className="font-semibold text-[var(--status-information-default)]">
                    {t("prescription_hint_emphasis")}
                  </span>{" "}
                  {t("prescription_hint_after")}
                </p>
              </div>
            </div>

            <h3 className="text-base font-medium leading-6 text-[var(--foreground-secondary)]">
              {t("medicines_needing_prescription")}
            </h3>

            {/* Selectable medicine rows */}
            {cartProductsData?.map((product) => {
              const variantId = product?.product_variant_id;
              const grouped = findGroupForVariant(groups, variantId);
              const isRequired = product?.require_prescription == 1;
              const isChecked = grouped ? true : selected?.includes(variantId);

              return (
                <label
                  key={variantId}
                  className={`flex flex-wrap items-center gap-3 sm:gap-6 rounded-2xl p-3 sm:p-4 outline outline-1 -outline-offset-1 ${
                    isChecked
                      ? "outline-[var(--brand-border-default)]"
                      : "outline-[var(--border-subtle)]"
                  } ${grouped ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <KigenCheckbox
                    checked={!!isChecked}
                    disabled={!!grouped}
                    onChange={() =>
                      dispatch(
                        togglePrescriptionSelection({ productId: variantId })
                      )
                    }
                  />
                  <div className="flex min-w-0 flex-1 basis-[140px] items-center gap-3">
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden">
                      <ImageWithPlaceholder
                        src={product?.image_url}
                        alt={product?.product?.translations?.name}
                        fill
                        sizes="64px"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="line-clamp-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                        {product?.product?.translations?.name}
                      </p>
                      <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">
                        {product?.measurement}{" "}
                        {product?.unit?.translations?.short_code}
                      </p>
                    </div>
                  </div>
                  <StatusPill tone={isRequired ? "warning" : "information"}>
                    {isRequired ? t("required") : t("optional")}
                  </StatusPill>
                </label>
              );
            })}

            {/* Selection summary — the upload action only appears once ticked */}
            {selected?.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 rounded-2xl p-3 sm:p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                <div className="flex min-w-0 flex-1 basis-[160px] items-center gap-3">
                  <FiCheck
                    size={24}
                    className="flex-shrink-0 text-[var(--foreground-primary)]"
                  />
                  <p className="line-clamp-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                    {selected.length} {t("items_selected")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openFilePicker()}
                  className="flex w-full sm:w-auto flex-shrink-0 items-center justify-center gap-1 rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2 text-base font-medium leading-6 text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                >
                  <FiUpload size={16} />
                  {t("upload_prescription")}
                </button>
              </div>
            )}

            {/* Uploaded prescriptions */}
            {groups?.length > 0 && (
              <>
                <h3 className="text-base font-medium leading-6 text-[var(--foreground-secondary)]">
                  {t("uploaded_prescriptions")}
                </h3>
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-col items-start justify-center gap-4 rounded-2xl p-3 sm:p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
                  >
                    {group.images?.map((img, i) => (
                      <div
                        key={i}
                        className="flex w-full items-center justify-between gap-3 sm:gap-4"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden">
                            <PrescriptionImageThumb src={img.preview} />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
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
                          className="flex flex-shrink-0 items-center justify-center gap-1 rounded-lg bg-[var(--button-destructive-background-default)] p-2 text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-destructive-background-hover)]"
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
                          <StatusPill key={id} tone="success" size="xs">
                            {nameOf(id)}
                          </StatusPill>
                        ))}
                      </div>
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
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-3 sm:gap-4">
            <p className="sm:flex-1 text-sm font-medium leading-5 text-[var(--foreground-tertiary)]">
              {t("prescription_file_hint")}
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
              >
                {t("close")}
              </button>
              {allCovered ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-1 rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2 text-base font-medium leading-6 text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                >
                  {t("done")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex flex-1 sm:flex-none cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-[var(--button-destructive-background-disabled)] px-4 py-2 text-center text-sm sm:text-base font-medium leading-6 text-[var(--button-destructive-foreground-disabled)]"
                >
                  {`${t("upload")} ${uncovered.length} ${t(
                    "upload_more_to_continue"
                  )}`}
                </button>
              )}
            </div>
          </div>
        </div>

        <input {...fileInputProps} />
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionUploadModal;
