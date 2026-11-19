import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { t } from "@/utils/translation";
import {
  addPrescriptionGroup,
  addImagesToGroup,
} from "@/redux/slices/checkoutSlice";
import { newImageId, saveImage } from "@/utils/prescriptionImageStore";
import type { ChangeEvent } from "react";
import type { AppDispatch } from "@/redux/hooks";
import type { PrescriptionImage } from "@/types/models/checkout";
import type { RootState } from "@/types/state";

// Max prescription images allowed per group.
export const MAX_IMAGES_PER_GROUP = 5;
// Formats the browser can actually decode into a preview, and that the API
// accepts. `image/*` also matches .heic (the default for iPhone/macOS shots),
// which no browser can render — it uploads fine but the thumbnail is broken.
export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Shared file-picking for prescriptions, used by both the cart panel and the
// upload modal. `openFilePicker()` starts a new group from the ticked items;
// `openFilePicker(groupId)` appends to a group that already exists.
export const usePrescriptionUpload = () => {
  const dispatch = useDispatch<AppDispatch>();
  const groups = useSelector((state: RootState) => state.Checkout.prescriptionGroups);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Which group the next file pick lands in; null means "make a new group".
  const targetGroupIdRef = useRef<number | null>(null);

  const openFilePicker = (groupId: number | null = null) => {
    targetGroupIdRef.current = groupId;
    fileInputRef.current?.click();
  };

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    let files = Array.from(e.target.files || []);
    e.target.value = "";
    const groupId = targetGroupIdRef.current;
    targetGroupIdRef.current = null;
    if (!files.length) return;

    const rejected = files.filter(
      (f) => !ACCEPTED_TYPES.includes(f.type) || f.size > MAX_FILE_BYTES
    );
    files = files.filter((f) => !rejected.includes(f));
    if (rejected.length) {
      toast.error(t("prescription_file_hint"));
    }
    if (!files.length) return;

    // Adding to an existing group only has room for what it hasn't used yet.
    const used = groupId
      ? groups?.find((g) => g.id === groupId)?.images?.length || 0
      : 0;
    const room = MAX_IMAGES_PER_GROUP - used;
    if (files.length > room) {
      files = files.slice(0, Math.max(room, 0));
      toast.error(t("max_prescription_images"));
    }
    if (!files.length) return;

    const images: PrescriptionImage[] = files.map((file) => ({
      imageId: newImageId(),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      preview: URL.createObjectURL(file),
    }));
    // Keep the bytes in IndexedDB so the group survives a page refresh.
    images.forEach((img) => saveImage(img.imageId, img.file!));
    if (groupId) {
      dispatch(addImagesToGroup({ id: groupId, images }));
    } else {
      dispatch(addPrescriptionGroup({ images }));
    }
  };

  return {
    openFilePicker,
    fileInputProps: {
      ref: fileInputRef,
      type: "file",
      accept: ACCEPTED_TYPES.join(","),
      multiple: true,
      className: "hidden",
      onChange: handleUpload,
    },
  };
};

export default usePrescriptionUpload;
