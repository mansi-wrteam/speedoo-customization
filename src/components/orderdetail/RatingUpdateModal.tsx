import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { IoIosCloseCircle } from 'react-icons/io';
import { RiCloseFill } from "react-icons/ri";
import { t } from '@/utils/translation';
import { TbCameraPlus } from 'react-icons/tb';
import * as api from "@/api/apiRoutes"
import { toast } from 'react-toastify';
import { MdOutlineStar } from 'react-icons/md';
import Image from 'next/image';
import type { Id, Nullable } from '@/types/common';
import type { ReviewImage } from '@/types/models';

export interface RatingUpdateModalProps {
    showUpdateRating: boolean;
    setShowUpdateRating: React.Dispatch<React.SetStateAction<boolean>>;
    /** Id of the customer's existing rating; null until one is picked, undefined if none matched. */
    ratingId: Nullable<Id> | undefined;
    handleFetchOrderDetail: () => Promise<void>;
}

const RatingUpdateModal = ({ showUpdateRating, setShowUpdateRating, ratingId, handleFetchOrderDetail }: RatingUpdateModalProps) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [rating, setRating] = useState<number | null | undefined>(null)
    const [review, setReview] = useState<Nullable<string> | undefined>(null)
    const [oldRatingImages, setOldRatingImages] = useState<ReviewImage[] | undefined>([])
    const [newRatingImages, setNewRatingImages] = useState<File[]>([])
    const [deletedImages, setDeletedImages] = useState<Id[]>([])

    const handleIconClick = () => {
        fileInputRef.current!.click();
    };

    useEffect(() => {
        if (showUpdateRating) {
            handleFetchRating()
        }
    }, [showUpdateRating])

    const handleFetchRating = async () => {
        try {
            const response = await api.getProductRating({ ratingId: ratingId as Id })
            if (response?.status == 1) {
                setRating(response?.data?.rate)
                setReview(response?.data?.review)
                setOldRatingImages(response?.data?.images)
            } else {
                toast.error(response.message)
            }
        } catch (error) {
            console.log("Error", error)
        }
    }

    const deletePrevImage = (image: ReviewImage) => {
        setDeletedImages(prevState => [...prevState, image?.id])
        const remainOldImages = oldRatingImages?.filter((img) => img?.id != image?.id)
        setOldRatingImages(remainOldImages)
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files!);
        setNewRatingImages(prevImages => [...prevImages, ...files]);
    };

    const removeImage = (index: number) => {
        setNewRatingImages(prevImages => prevImages.filter((_, idx) => idx !== index));
    };


    const handleHideUpdateRatingModal = () => {
        setShowUpdateRating(false)
    }

    const handleUpdateRating = async () => {
        try {
            if (buttonRef.current) {
                buttonRef.current.disabled = true;
            }
            const response = await api.updateReviewProduct({ ratingId: ratingId as Id, rating: rating, review: review, deleteImages: deletedImages, images: newRatingImages })
            if (response.status == 1) {
                toast.success(response.message)
                setRating(null)
                setReview(null)
                setDeletedImages([])
                setNewRatingImages([])
                setShowUpdateRating(false)
                await handleFetchOrderDetail()
            } else {
                toast.error(response.message)
                if (buttonRef.current) {
                    buttonRef.current.disabled = false;
                }
            }
        } catch (error) {
            console.log("error", error)
            buttonRef.current!.disabled = false;
        }
    }

    return (
        <Dialog open={showUpdateRating}>
            <DialogContent>
                <DialogHeader className="font-bold text-2xl text-start flex flex-row justify-between">
                    {t("update_rating")}
                    <div className="cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]">
                        <RiCloseFill size={22} onClick={handleHideUpdateRatingModal} />
                    </div>
                </DialogHeader>
                <div>
                    <div className='flex flex-col gap-8'>
                        <div className='p-4 bg-[var(--surface-subtle)] flex flex-col gap-2 rounded-lg'>
                            <span>{t("overall_rating")}:</span>
                            <div className='flex flex-row'>
                                <div className="flex gap-1">
                                    {Array(5)
                                        .fill(rating)
                                        .map((_, idx) => (
                                            <label key={idx} className="cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="rating"
                                                    onChange={() => setRating(idx + 1)}
                                                    value={rating as number}
                                                    className="hidden"
                                                />
                                                <MdOutlineStar
                                                    className={idx < (rating as number) ? "text-[var(--status-warning-default)]" : "text-[var(--foreground-disabled)]"}
                                                    size={32} // Adjust size if needed
                                                    onClick={() => setRating(idx + 1)}
                                                />
                                            </label>
                                        ))}
                                </div>
                            </div>
                        </div>
                        <div className='flex flex-col gap-1'>
                            <span>{t("product_review")}</span>
                            <textarea name="" id="" value={review as string} onChange={(e) => setReview(e.target.value)} placeholder={t("write_review_here")} className='rounded-lg bg-[var(--form-default-background)] p-2 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]'></textarea>
                        </div>
                        <div className='flex  gap-2 flex-wrap'>
                            {oldRatingImages?.map((image, index) => (
                                <div key={index} className="relative">
                                    <Image
                                        height={500}
                                        width={500}
                                        src={image?.image_url as string}
                                        alt={`Preview ${index + 1}`}
                                        className="w-24 h-24 object-cover rounded-md"
                                    />
                                    <button
                                        onClick={() => deletePrevImage(image)}
                                        className="absolute -top-4 -right-2 flex h-6 w-6 items-center rounded-full text-[var(--status-error-default)]"
                                    >
                                        <IoIosCloseCircle size={28} />
                                    </button>
                                </div>
                            ))}
                            {newRatingImages?.map((src, index) => (
                                <div key={index} className="relative">
                                    <Image
                                        height={100}
                                        width={100}
                                        src={URL.createObjectURL(src)}
                                        alt={`Preview ${index + 1}`}
                                        className="w-24 h-24 object-cover rounded-md"
                                    />
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="absolute -top-4 -right-2 flex h-6 w-6 items-center rounded-full text-[var(--status-error-default)]"
                                    >
                                        <IoIosCloseCircle size={28} />
                                    </button>
                                </div>
                            ))}
                            <div className='flex h-10 w-12 items-center justify-center rounded-lg p-12 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]' onClick={handleIconClick}>
                                <div>
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
                                        name="image-upload"

                                        className="cursor-pointer"
                                    />
                                </div>
                            </div>

                        </div>
                        <div className='flex justify-end'>
                            <button className='rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:bg-[var(--button-primary-background-disabled)] disabled:text-[var(--button-primary-foreground-disabled)]' onClick={handleUpdateRating} ref={buttonRef}>{t("submit")}</button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default RatingUpdateModal