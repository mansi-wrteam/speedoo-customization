import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { t } from "@/utils/translation";
import type { Seller } from "@/types/models/catalog";

export interface SellerListingCardProps {
  seller: Seller;
}

const SellerListingCard = ({ seller }: SellerListingCardProps) => {
  const productCount = seller?.total_products;

  return (
    <div className="group flex w-full cursor-pointer items-center justify-start gap-4 rounded-lg bg-[var(--surface-subtle)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] transition-all duration-300 hover:shadow-sm hover:outline-[var(--brand-border-default)]">
      <ImageWithPlaceholder
        src={seller?.logo_url}
        width={160}
        height={160}
        alt={seller?.translations?.store_name ?? "Seller"}
        className="size-20 shrink-0 rounded-lg object-cover"
      />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="text-lg md:text-xl font-bold leading-6 line-clamp-2">
          {seller?.translations?.store_name}
        </div>
        {productCount != null ? (
          <div className="line-clamp-1 text-sm font-normal leading-4 text-[var(--foreground-tertiary)]">
            {productCount > 50 ? "50+" : productCount}{" "}
            {productCount === 1 ? t("product") : t("products")}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SellerListingCard;
