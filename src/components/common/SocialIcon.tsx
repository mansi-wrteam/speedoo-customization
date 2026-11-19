import React, { useState } from "react";
import { FiGlobe } from "react-icons/fi";

export interface SocialIconProps {
  image?: string;
  alt?: string;
  className?: string;
}

// Renders the admin-configured social icon image; falls back to a generic
// SVG glyph when the API sends no image or the URL fails to load.
const SocialIcon = ({ image, alt, className = "" }: SocialIconProps) => {
  const [error, setError] = useState(false);

  if (!image || error) {
    return <FiGlobe className={className} />;
  }

  return (
    <img
      src={image}
      alt={alt || "social"}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default SocialIcon;
