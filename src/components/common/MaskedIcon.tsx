import React from "react";
import type { StaticImageData } from "next/image";

export interface MaskedIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Imported SVG (static import) or a URL. */
  src: string | StaticImageData;
  /** Any CSS colour — pass a token, e.g. "var(--foreground-primary)". */
  color?: string;
  /** Sizing/layout classes. Must set a width and height. */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a single-colour SVG asset tinted with a design token.
 *
 * Static SVG imports are served as image URLs by next/image, so their baked-in
 * `fill` cannot be restyled with CSS. Painting the shape as a mask over a solid
 * background lets the colour come from a token instead.
 *
 * @param {object|string} src   Imported SVG (static import object) or a URL.
 * @param {string} color        Any CSS colour — pass a token, e.g. "var(--foreground-primary)".
 * @param {string} className    Sizing/layout classes. Must set a width and height.
 */
const MaskedIcon = ({
  src,
  color = "var(--foreground-primary)",
  className = "",
  style,
  ...rest
}: MaskedIconProps) => {
  const url = typeof src === "string" ? src : src?.src;

  return (
    <span
      aria-hidden="true"
      className={`inline-block ${className}`}
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${url})`,
        maskImage: `url(${url})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
      {...rest}
    />
  );
};

export default MaskedIcon;
