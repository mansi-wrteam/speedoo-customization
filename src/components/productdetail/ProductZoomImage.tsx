import React, { useEffect, useState } from "react";
import ReactImageMagnify from "react-image-magnify";
import { useSelector } from "react-redux";
import { Card, CardContent } from "../ui/card";
import { optimizedImageUrl } from "@/utils/optimizedImageUrl";
import type { RootState } from "@/types/state";

export interface ProductZoomImageProps {
  /** Falls back to the admin placeholder image when empty. */
  image?: string;
}

const ProductZoomImage = ({ image }: ProductZoomImageProps) => {
  const setting = useSelector((state: RootState) => state.Setting);
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const isRtl = language?.type?.toLowerCase() === "rtl";
  const imageSrc = image || setting?.setting?.web_settings?.placeholder_image;

  const placeholder = setting?.setting?.web_settings?.placeholder_image;

  // Undefined when neither the image nor the admin placeholder is set (cast to string below).
  const [imgSrc, setImgSrc] = useState(image || placeholder);

  useEffect(() => {
    setImgSrc(image || placeholder);
  }, [image, placeholder]);

  return (
    <Card className="border-0 shadow-none h-full w-full">
      <CardContent className="p-0 h-full w-full">
        <div className="flex justify-center items-center h-full">
          <div className="w-full  h-full custom-img-wrapper">
            <ReactImageMagnify
              {...{
                smallImage: {
                  alt: "Product Image",
                  isFluidWidth: true,
                  // Optimized by hand: this library renders a raw <img>, so it
                  // never passes through next/image on its own.
                  src: optimizedImageUrl(imgSrc, 640) as string,
                  onError: () => {
                    setImgSrc(placeholder);
                  },
                },
                largeImage: {
                  // The zoom panel renders at 900x1200, so ask the optimizer for
                  // the 1200 bucket rather than the full-size original.
                  src: optimizedImageUrl(imgSrc, 1200) as string,
                  width: 900,
                  height: 1200,
                },
                imageClassName: "my-custom-image-class",
                // Rounding lives on the image because the wrapper can't use
                // overflow-hidden without clipping the enlarged zoom panel.
                imageStyle: { borderRadius: "14px" },
                enlargedImageContainerDimensions: {
                  width: "220%",
                  height: "150%",
                },
                enlargedImageContainerStyle: {
                  zIndex: 1000,
                  overflow: "hidden",
                  backgroundColor: "var(--surface-default)",
                  border: "none",
                  borderRadius: "12px",
                  // RTL: show the zoom panel beside the image on the LEFT
                  // (default lib style places it on the right via left:100%).
                  ...(isRtl
                    ? {
                        left: "auto",
                        right: "100%",
                        marginLeft: "0px",
                        marginRight: "10px",
                      }
                    : {}),
                },
                enlargedImagePosition: "beside",
                lensStyle: {
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                },
                hintTextMouse: "Hover to zoom",
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductZoomImage;
