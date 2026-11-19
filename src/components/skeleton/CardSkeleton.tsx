import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export interface CardSkeletonProps {
    /** Legacy generic skeleton only. */
    height?: number | string;
    /** Legacy generic skeleton only. */
    width?: number | string;
    /** Class names added to the legacy wrapper. */
    padding?: string;
    /** Product card layout ("grid" / "list"), category grid card ("category"); omit for the legacy generic block. */
    variant?: "grid" | "list" | "category";
}

const CardSkeleton = ({ height, width = "100%", padding, variant }: CardSkeletonProps) => {
    // Vertical / grid product card skeleton
    if (variant === "grid") {
        return (
            <div className="flex flex-col gap-3 w-full">
                <Skeleton
                    containerClassName="block w-full aspect-square"
                    className="!w-full !h-full !rounded-2xl"
                />
                <div className="flex flex-col gap-1.5">
                    <Skeleton width={90} height={14} />
                    <Skeleton width="80%" height={18} />
                    <Skeleton width={70} height={14} />
                    <Skeleton width={55} height={14} />
                </div>
            </div>
        );
    }

    // Category grid card — matches CategoryCard: square rounded-2xl image tile,
    // centred name below, no border.
    if (variant === "category") {
        return (
            <div className="flex flex-col items-center gap-2 w-full">
                <Skeleton
                    containerClassName="block w-full aspect-square leading-none"
                    className="!w-full !h-full !rounded-2xl"
                />
                <Skeleton width="70%" height={16} containerClassName="block w-full text-center leading-none" />
            </div>
        );
    }

    // List view product card skeleton
    if (variant === "list") {
        return (
            <div className="flex overflow-hidden rounded-2xl bg-[var(--surface-default)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                <div className="flex-1 p-4 flex flex-col gap-2">
                    <Skeleton width={90} height={14} />
                    <Skeleton width="70%" height={22} />
                    <Skeleton width={90} height={16} />
                    <Skeleton width={60} height={14} />
                </div>
                <div className="w-32 shrink-0 p-2">
                    <Skeleton
                        containerClassName="block w-full h-full min-h-[120px]"
                        className="!w-full !h-full !rounded-2xl"
                    />
                </div>
            </div>
        );
    }

    // Legacy generic skeleton
    return (
        <div className={`flex  w-full ${padding ?? ""}`}>
            <div className="w-full rounded-lg p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                <Skeleton height={height} width={width} />
            </div>
        </div>
    );
};

export default CardSkeleton;