import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { t } from "@/utils/translation";
import { IoIosCloseCircle } from "react-icons/io";
import { RiCloseFill } from "react-icons/ri";
import { MdOutlineStar } from "react-icons/md";
import { TbCameraPlus } from "react-icons/tb";
import Image from "next/image";
import { toast } from "react-toastify";
import * as api from "@/api/apiRoutes";
import type { OrderItem } from "@/types/models";

export interface ProductRatingModalProps {
  showRating: boolean;
  setShowRating: React.Dispatch<React.SetStateAction<boolean>>;
  /** Order line being rated (its `product_id` is reviewed). */
  selectedProduct: OrderItem;
  handleFetchOrderDetail: () => Promise<void>;
}

const ProductRatingModal = ({
  showRating,
  setShowRating,
  selectedProduct,
  handleFetchOrderDetail,
}: ProductRatingModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const handleIconClick = () => {
    fileInputRef.current!.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files!);
    setImages((prevImages) => [...prevImages, ...files]);
  };
  const removeImage = (index: number) => {
    setImages((prevImages) => prevImages.filter((_, idx) => idx !== index));
  };

  const handleHideRatingModal = () => {
    setRating(null);
    setReview("");
    setImages([]);
    setShowRating(false);
  };

  const handleRatingSubmit = async () => {
    try {
      if (rating == null) {
        toast.error(t("product_rating_is_required"));
        return;
      }
      const response = await api.reviewProduct({
        productId: selectedProduct?.product_id,
        rating: rating,
        review: review,
        images: images,
      });
      if (response.status == 1) {
        toast.success(response.message);
        await handleFetchOrderDetail();
        setRating(null);
        setReview("");
        setImages([]);
        setShowRating(false);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  return (
    <Dialog open={showRating}>
      <DialogContent className="max-w-[752px] w-full p-0 gap-0 rounded-2xl overflow-hidden bg-[var(--surface-default)]">
        <DialogHeader className="p-4 border-b border-[var(--border-subtle)] flex flex-row justify-between items-center space-y-0">
          <span className="text-xl font-semibold text-[var(--foreground-primary)]">
            {t("rate_the_product")}
          </span>
          <div className="rounded-lg p-3 gap-1 cursor-pointer">
            <RiCloseFill
              size={22}
              className="text-[var(--button-link-foreground-default)]"
              onClick={handleHideRatingModal}
            />
          </div>
        </DialogHeader>
        <div className="p-4 flex flex-col gap-6">
          {/* Overall rate */}
          <div className="p-4 bg-[var(--surface-subtle)] flex flex-col gap-2 rounded-lg">
            <span className="text-base font-medium text-[var(--foreground-primary)]">
              {t("overall_rating")} :
            </span>
            <div className="flex gap-1">
              {Array(5)
                .fill(0)
                .map((_, idx) => (
                  <label key={idx} className="cursor-pointer p-1">
                    <input
                      type="radio"
                      name="rating"
                      onChange={() => setRating(idx + 1)}
                      value={rating as number}
                      className="hidden"
                    />
                    <MdOutlineStar
                      size={28}
                      className={
                        idx < (rating as number)
                          ? "text-[var(--brand-background-default)]"
                          : "text-[var(--foreground-placeholder)]"
                      }
                      onClick={() => setRating(idx + 1)}
                    />
                  </label>
                ))}
            </div>
          </div>
          {/* Product review */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-normal text-[var(--form-default-label)]">
              {t("product_review")}
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t("write_review_here")}
              className="w-full h-32 px-2 py-1 bg-[var(--form-default-background)] border border-[var(--form-default-border)] rounded-lg outline-none text-base text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] resize-none"
            ></textarea>
          </div>
          {/* Image upload */}
          <div className="flex gap-4 flex-wrap">
            {images.map((src, index) => (
              <div key={index} className="relative size-20">
                <Image
                  height={200}
                  width={200}
                  src={URL.createObjectURL(src)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-sm"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-[var(--status-error-default)] text-[var(--status-error-on-status)] rounded-lg flex items-center justify-center"
                >
                  <IoIosCloseCircle size={16} />
                </button>
              </div>
            ))}
            <div
              className="size-20 bg-[var(--form-default-background)] border border-[var(--border-default)] rounded-lg flex items-center justify-center cursor-pointer"
              onClick={handleIconClick}
            >
              <input
                type="file"
                multiple
                hidden
                name="image-upload"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <TbCameraPlus
                size={32}
                className="cursor-pointer text-[var(--foreground-tertiary)]"
              />
            </div>
          </div>
          {/* Submit */}
          <div className="flex justify-end">
            <button
              className="px-6 py-3 bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] text-[var(--button-primary-foreground-default)] rounded-lg font-medium text-xl transition-colors"
              onClick={handleRatingSubmit}
            >
              {t("submit")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductRatingModal;
