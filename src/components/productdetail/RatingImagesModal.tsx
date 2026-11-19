import { useState } from 'react';
import type React from 'react';
import type { Slide } from "yet-another-react-lightbox";
import {
    Dialog,
    DialogContent, DialogHeader
} from "@/components/ui/dialog";
import RatingLightBox from './RatingLightBox';
import { t } from '@/utils/translation';
import ImageWithPlaceholder from '../image-with-placeholder/ImageWithPlaceholder';
import type { ProductImageObject, ProductRatingImages } from '@/types/models';

export interface RatingImagesModalProps {
    showImagesModal: boolean;
    setShowImagesModal: React.Dispatch<React.SetStateAction<boolean>>;
    images: ProductRatingImages;
}

const RatingImagesModal = ({ showImagesModal, setShowImagesModal, images }: RatingImagesModalProps) => {

    const [showLightBox, setShowLightbox] = useState(false)
    const [imageIndex, setImageIndex] = useState(0)
    const [lightBoxImages, setLightBoxImages] = useState<Slide[]>([])

    const handleLightBox = (index: number) => {
        // getProductImages returns plain URLs; the `.src` read is a defensive fallback for object entries.
        const ratingImages = images?.map((img) => ({ src: (img as ProductImageObject)?.src ? (img as ProductImageObject)?.src : img }))
        setLightBoxImages(ratingImages as Slide[])
        setImageIndex(index)
        setShowLightbox(true)
    }

    return (
        <div>
            <Dialog open={showImagesModal} onOpenChange={setShowImagesModal}>

                <DialogContent>
                    <DialogHeader>
                        <h1 className='font-bold text-2xl'>{t("Rating_images")}</h1>
                    </DialogHeader>
                    <div className='flex flex-wrap gap-2 justify-center'>
                        {images?.map((image, index) => {
                            return (
                                <div className="relative w-24 h-24 rounded overflow-hidden" key={index}>
                                    <ImageWithPlaceholder
                                        src={image}
                                        alt="Rating image"
                                        width={96}
                                        height={96}
                                        sizes="96px"
                                        quality={75}
                                        loading="lazy"
                                        className="h-full w-full object-cover"
                                        handleOnClick={() => handleLightBox(index)}
                                    /></div>
                            )
                        })}
                    </div>
                </DialogContent>
            </Dialog>
            <RatingLightBox showLightBox={showLightBox} setShowLightbox={setShowLightbox} images={lightBoxImages} imageIndex={imageIndex} />
        </div>
    )
}


export default RatingImagesModal