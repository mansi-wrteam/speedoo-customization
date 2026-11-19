import React from "react";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { useLocalizedRouter } from "@/utils/localizedNav";
import { setFilterCategory } from "@/redux/slices/productFilterSlice";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/redux/hooks";
import type { Offer } from "@/types/models";

export interface HomeOfferSectionProps {
  offer: Offer;
}

const HomeOfferSection = ({ offer }: HomeOfferSectionProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useLocalizedRouter();

  const handleOfferClick = () => {
    if (offer?.type == "product") {
      router.push(`/product/${offer?.product?.slug}`);
    } else if (offer?.type == "category") {
      if (offer?.category?.has_child == true) {
        router.push(`/categories/${offer?.type_slug}`);
      } else {
        dispatch(setFilterCategory({ data: offer?.category?.id.toString() as string }));
        router.push(`/products`);
      }
    } else if (offer?.offer_url) {
      window.open(offer?.offer_url, "_blank");
    }
  };

  return (
    <div className="py-2 px-2 relative " key={offer?.id}>
      <ImageWithPlaceholder
        src={offer?.image_url}
        alt="Offer image"
        width={1304}
        height={320}
        quality={90}
        priority={true}
        fetchPriority="high"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1304px"
        className="max-h-[320px] h-full w-full rounded-sm"
        handleOnClick={handleOfferClick}
      />
    </div>
  );
};

export default HomeOfferSection;
