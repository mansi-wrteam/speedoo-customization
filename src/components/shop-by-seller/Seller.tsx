import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { isRtl } from "@/lib/utils";
import { t } from "@/utils/translation";
import type { Seller as SellerModel } from "@/types/models/catalog";

export interface SellerProps {
  seller: SellerModel;
}

const Seller = ({ seller }: SellerProps) => {
  const rtl = isRtl();
  const productCount = seller?.total_products;
  return (
    <div className="group relative flex flex-row items-center gap-4 overflow-hidden rounded-lg bg-[var(--surface-default)] p-4 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] hover:cursor-pointer">
      <div
        className={`absolute inset-0 bg-[var(--brand-background-default)] ${rtl ? "translate-x-full" : "-translate-x-full"} transition-transform duration-500 ease-in-out group-hover:translate-x-0`}
      />
      <div className="relative z-10 flex w-full min-w-0 flex-row items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <ImageWithPlaceholder
            src={seller?.logo_url}
            alt={seller?.translations?.name}
            fill
            sizes="80px"
            className="rounded-lg object-cover"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="line-clamp-2 text-base font-bold leading-6 text-[var(--foreground-primary)] transition-colors group-hover:text-[var(--brand-foreground-on-brand)]">
            {seller?.translations?.store_name}
          </div>
          {productCount != null ? (
            <div className="line-clamp-2 text-sm font-normal leading-5 text-[var(--foreground-secondary)] transition-colors group-hover:text-[var(--brand-foreground-on-brand)]">
              {productCount > 50 ? "50+" : productCount}{" "}
              {productCount === 1 ? t("product") : t("products")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Seller;
