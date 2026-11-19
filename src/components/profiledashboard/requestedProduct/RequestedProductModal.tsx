import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { t } from "@/utils/translation";
import { IoIosCloseCircle } from "react-icons/io";
import { RiCloseFill } from "react-icons/ri";
import * as api from "@/api/apiRoutes";
import { toast } from "react-toastify";
import Image from "next/image";

export interface RequestedProductModalProps {
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  /** Toggled after a successful request so RequestProducts refetches. */
  setFlag: React.Dispatch<React.SetStateAction<boolean>>;
}

const RequestedProductModal = ({ showModal, setShowModal, setFlag }: RequestedProductModalProps) => {
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.setProductRequest({ description, image });
      if (response.status == 1) {
        setShowModal(false);
        setDescription("");
        removeImage();
        setLoading(false);
        setFlag((prev) => !prev);
        toast.success(response.message);
      } else {
        toast.error(response.message);
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.log("error", error);
    }
  };

  return (
    <Dialog open={showModal}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-0 bg-[var(--surface-default)]">
        <DialogHeader className="flex justify-between items-center flex-row">
          <h1 className="text-xl font-semibold leading-7 text-[var(--foreground-primary)]">{t("requestProduct")}</h1>
          <div className="cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2">
            <RiCloseFill
              size={22}
              className="cursor-pointer text-[var(--foreground-primary)] transition hover:text-[var(--foreground-secondary)]"
              onClick={() => setShowModal(false)}
            />
          </div>
        </DialogHeader>

        <div className="mt-4">
          {/* Description */}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-base font-medium leading-6 text-[var(--foreground-primary)]"
            >
              {t("productDescription")}
            </label>
            <textarea
              id="description"
              name="description"
              placeholder={t('enter_product_desription')}
              className="mt-1 block w-full rounded-lg bg-[var(--form-default-background)] p-2 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="mb-2 block text-base font-medium leading-6 text-[var(--foreground-primary)]">
              {t("productImage")}
            </label>

            {!preview ? (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-[var(--foreground-secondary)] file:mr-4 file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold file:bg-[var(--button-primary-background-default)] file:text-[var(--button-primary-foreground-default)] hover:file:bg-[var(--button-primary-background-hover)]"
              />
            ) : (
              <div className="relative inline-block mt-2">
                <Image
                  src={preview}
                  alt="Preview"
                  width={160}
                  height={160}
                  className="h-40 w-40 rounded-lg border border-[var(--border-subtle)] object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 rounded-full bg-[var(--surface-default)] shadow transition hover:bg-[var(--surface-subtle)]"
                >
                  <IoIosCloseCircle size={24} className="text-[var(--status-error-default)]" />
                </button>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end w-full">
            <button
              type="button"
              className="w-40 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-foreground-disabled)]"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? t("loading") : t("submitRequest")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestedProductModal;
