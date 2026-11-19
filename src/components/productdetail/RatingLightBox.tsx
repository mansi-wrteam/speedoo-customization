import React from 'react'
import Lightbox from "yet-another-react-lightbox";
import type { Slide } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export interface RatingLightBoxProps {
    showLightBox: boolean;
    setShowLightbox: React.Dispatch<React.SetStateAction<boolean>>;
    images: Slide[];
    imageIndex: number;
}

const RatingLightBox = ({ showLightBox, setShowLightbox, images, imageIndex }: RatingLightBoxProps) => {
    return (
        <div>
            <Lightbox
                styles={{
                    container: {
                        backgroundColor: "#000000bf",
                    }
                }}
                index={imageIndex}
                open={showLightBox}
                close={() => setShowLightbox(false)}
                slides={images}
            />
        </div>
    )
}

export default RatingLightBox