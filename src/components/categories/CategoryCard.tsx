import React from "react";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import type { Category } from "@/types/models/catalog";

export interface CategoryCardProps {
  category: Category;
  /** Resolved card background (resolveCardBg); transparent when empty. */
  bgColor?: string | null;
  /** Passed by SubCategorySwiper but not read here. */
  imageSize?: number;
  /** Passed by SubCategorySwiper but not read here. */
  padding?: number;
}

const CategoryCard = ({ category, bgColor }: CategoryCardProps) => {
  return (
    <div className="rounded-2xl flex flex-col justify-start items-center gap-2 cursor-pointer w-full group">
      {/* Image tile — transparent by default; admin color (resolveCardBg) wins when set */}
      <div
        className="self-stretch aspect-square rounded-2xl flex justify-center items-center overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]"
        style={{ backgroundColor: bgColor || "transparent" }}
      >
        <ImageWithPlaceholder
          src={category.image_url}
          width={300}
          height={300}
          alt={category?.translations?.name ?? category?.name ?? "category"}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="self-stretch text-center text-[var(--foreground-primary)] text-sm md:text-base font-medium leading-5 md:leading-6 line-clamp-2">
        {category?.translations?.name ?? category?.name}
      </div>
    </div>
  );
};

export default CategoryCard;
