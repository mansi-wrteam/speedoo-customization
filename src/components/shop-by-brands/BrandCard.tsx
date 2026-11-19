import React from 'react'
import ImageWithPlaceholder from '../image-with-placeholder/ImageWithPlaceholder'
import type { Brand } from "@/types/models/catalog";

export interface BrandCardProps {
    brand: Brand;
    bgColor?: string | null;
}

const BrandCard = ({ brand, bgColor }: BrandCardProps) => {
    return (
        <div className="group flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl">
            <div
                className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl ${bgColor ? "" : "bg-[var(--surface-subtle)]"}`}
                style={bgColor ? { backgroundColor: bgColor } : undefined}
            >
                <ImageWithPlaceholder
                    src={brand?.image_url}
                    alt={brand?.translations?.name ?? brand?.name}
                    sizes="(max-width: 768px) 25vw, 200px"
                    className="rounded-2xl object-cover"
                />
            </div>
            <div className="line-clamp-2 self-stretch text-center text-base font-normal leading-6 text-[var(--foreground-primary)] transition-colors group-hover:text-[var(--brand-foreground-default)]">
                {brand?.translations?.name ?? brand?.name}
            </div>
        </div>
    )
}

export default BrandCard
