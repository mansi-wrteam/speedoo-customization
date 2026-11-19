import React, { useState, useEffect } from "react";
import { FiFileText } from "react-icons/fi";

export interface PrescriptionImageThumbProps {
  /** Object URL made at upload time (`PrescriptionImage.preview`); empty shows the document icon. */
  src?: string;
  alt?: string;
  className?: string;
}

/**
 * Thumbnail for an uploaded prescription image.
 *
 * The src is an object URL created at upload time. It dies when the tab is
 * reloaded (and the File behind it is gone after redux-persist rehydration),
 * and some picked formats — .heic in particular — can't be decoded by the
 * browser at all. Both cases render as a broken-image glyph, so fall back to a
 * neutral document icon instead.
 */
const PrescriptionImageThumb = ({ src, alt = "prescription", className = "" }: PrescriptionImageThumbProps) => {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--foreground-tertiary)] ${className}`}
      >
        <FiFileText size={24} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`h-full w-full rounded-lg object-cover ${className}`}
    />
  );
};

export default PrescriptionImageThumb;
