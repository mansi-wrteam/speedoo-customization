import { useState } from 'react'
import { FaRegCalendarAlt, FaStar } from 'react-icons/fa'
import type { Slide } from "yet-another-react-lightbox";
import RatingLightBox from './RatingLightBox'
import ImageWithPlaceholder from '../image-with-placeholder/ImageWithPlaceholder'
import type { DateString } from '@/types/common'
import type { ProductReview } from '@/types/models'

export interface ProductReviewCardProps {
    review: ProductReview;
}

const ProductReviewCard = ({ review }: ProductReviewCardProps) => {

    const [showLightBox, setShowLightbox] = useState(false)
    const [imageIndex, setImageIndex] = useState(0)
    const [lightBoxImages, setLightBoxImages] = useState<Slide[]>([])
    const formatDate = (data: DateString) => {
        const date = new Date(data);
        const day = date.getUTCDate();
        const month = date.toLocaleString('en-US', { month: 'long' });
        const year = date.getUTCFullYear();
        return `${day}, ${month} ${year}`;
    }


    const handleLightBox = (index: number) => {
        const images = review?.images?.map((img) => {
            return ({ src: img?.image_url })
        })
        // image_url can be null on bad rows and `images` absent; passed through as before.
        setLightBoxImages(images as Slide[])
        setImageIndex(index)
        setShowLightbox(true)
    }

    return (
        <div className='flex flex-col gap-6'>
            <div className="flex max-w-full items-start gap-4">
                {/* User Image */}
                <div className="flex shrink-0 items-center rounded-lg p-1 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                        <ImageWithPlaceholder src={review?.user?.profile} alt={review?.user?.name} sizes="64px" className='h-full w-full rounded-lg object-cover' />
                    </div>
                </div>

                {/* Review Content */}
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        {/* User Info */}
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{review?.user?.name || "Anonymous"}</span>
                            <div className="flex shrink-0 items-center gap-1">
                                {/* Star Ratings — 20px icons, gap-1 between each and the value */}
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <FaStar
                                        key={index}
                                        size={20}
                                        className={
                                            index < (review?.rate as number)
                                                ? "text-[var(--status-warning-default)]"
                                                : "text-[var(--foreground-disabled)]"
                                        }
                                    />
                                ))}
                                <span className="text-sm font-medium leading-5 text-[var(--foreground-primary)]">{review?.rate}</span>
                            </div>
                        </div>
                        <p className="text-base font-normal leading-6 text-[var(--foreground-secondary)]">
                            {review?.review}
                        </p>
                    </div>
                    <div className="flex w-full items-center gap-2 text-[var(--foreground-tertiary)]">
                        <FaRegCalendarAlt size={16} className="shrink-0" />
                        <span className="flex-1 text-sm font-normal leading-5">
                            {review?.updated_at}
                        </span>
                    </div>
                    {(review?.images?.length as number) > 0 && (
                        <div className="flex flex-wrap gap-4">
                            {review?.images?.map((image, index) => {
                                return (<div className="relative h-12 w-12 overflow-hidden rounded-lg" key={index}>
                                    <ImageWithPlaceholder src={image?.image_url} alt="Rating image" sizes="48px" className='h-full w-full rounded-lg object-cover cursor-pointer' handleOnClick={() => handleLightBox(index)} />
                                </div>)
                            })}
                        </div>
                    )}
                </div>
            </div>
            {/* Divider between reviews */}
            <div className="h-px w-full bg-[var(--border-subtle)]" />
            <RatingLightBox showLightBox={showLightBox} setShowLightbox={setShowLightbox} images={lightBoxImages} imageIndex={imageIndex} />
        </div>

    )
}

export default ProductReviewCard
