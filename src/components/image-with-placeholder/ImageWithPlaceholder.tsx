"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import ImagePlaceholder from "../../assets/image-placeholder/image.png";
import { useSelector } from "react-redux";
import type { RootState } from "@/types/state";

export interface ImageWithPlaceholderProps {
  /** Falls back to the admin placeholder image (or the bundled one) when empty. */
  src?: string | StaticImageData | null;
  alt?: string | null;
  className?: string;
  handleOnClick?: React.MouseEventHandler<HTMLImageElement>;
  priority?: boolean;
  /** Only used in fill mode (no width/height). */
  sizes?: string;
  quality?: number;
  width?: number;
  height?: number;
  // Passed by some callers but never read — not forwarded to <Image>.
  fill?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "lazy" | "eager";
  onClick?: React.MouseEventHandler<HTMLImageElement>;
}

const ImageWithPlaceholder = ({
  src,
  alt,
  className,
  handleOnClick,
  priority,
  sizes,
  quality,
  width,
  height,
}: ImageWithPlaceholderProps) => {
  const setting = useSelector((state: RootState) => state.Setting);
  const [isLoading, setIsLoading] = useState(!src);
  const [isError, setIsError] = useState(false);
  // The admin placeholder can be broken too; then only the bundled one is left.
  const [placeholderFailed, setPlaceholderFailed] = useState(false);
  const adminPlaceholder = setting?.setting?.web_settings?.placeholder_image;
  const showPlaceholder = !src || isLoading || isError;

  // Reset stale states when src changes — otherwise a single failed/missing
  // src leaves the placeholder stuck even after a valid image arrives
  useEffect(() => {
    setIsLoading(!src);
    setIsError(false);
  }, [src]);

  // NOTE:Change from nextjs Image to regular img to get rid of placeholder image error
  return (
    <Image
      src={
        showPlaceholder
          ? adminPlaceholder && !placeholderFailed
            ? adminPlaceholder
            : ImagePlaceholder
          : src
      }
      alt={alt || "image"}
      {...(width && height
        ? { width, height }
        : {fill: true, sizes: sizes || "100vw" })}
      quality={quality}
      priority={priority}
      className={className}
      
      onClick={handleOnClick}
      onLoad={() => {
        setIsLoading(false);
      }}
      onError={() => {
        if (showPlaceholder) {
          setPlaceholderFailed(true);
          return;
        }
        setIsLoading(false);
        setIsError(true);
      }}
    />
  );
};

export default ImageWithPlaceholder;
