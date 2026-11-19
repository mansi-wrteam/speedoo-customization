import React, { useEffect, useMemo, useState } from "react";
import type { Slide } from "yet-another-react-lightbox";
import { t } from "@/utils/translation";
import { Progress } from "@/components/ui/progress";
import * as api from "@/api/apiRoutes";
import NoReviewImage from "@/assets/No_Review_Found.svg";
import ProductReviewCard from "./ProductReviewCard";
import RatingImagesModal from "./RatingImagesModal";
import RatingLightBox from "./RatingLightBox";
import ImageWithPlaceholder from "../image-with-placeholder/ImageWithPlaceholder";
import { getSpecificationRows } from "@/utils/productSpecs";
import { isRtl } from "@/lib/utils";
import { FaStar } from "react-icons/fa";
import { useSelector } from "react-redux";
import type {
  Product,
  ProductImageObject,
  ProductRatingImages,
  ProductRatingSummary,
} from "@/types/models";
import type { RootState } from "@/types/state";

export interface ProductDescriptionProps {
  product: Product;
  ratingData: ProductRatingSummary;
}

const ProductDescription = ({ product, ratingData }: ProductDescriptionProps) => {
  const rtl = isRtl();

  const setting = useSelector((state: RootState) => state.Setting.setting);

  const [selectedTab, setSelectedTab] = useState(0);
  const [ratingImages, setRatingImages] = useState<ProductRatingImages>([]);
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [showLightBox, setShowLightbox] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightBoxImages, setLightBoxImages] = useState<Slide[]>([]);

  useEffect(() => {
    fetchProductImages();
  }, [product?.id]);

  const ratingsCount = 10;
  const productImagesCount = 8;

  const fetchProductImages = async () => {
    try {
      const result = await api.getProductImages({
        id: product?.id,
        limit: productImagesCount,
        offset: 0,
      });
      setRatingImages(result.data);
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleProductDescSelect = () => {
    setSelectedTab(0);
  };

  const handleProductReviewSelect = () => {
    setSelectedTab(1);
  };

  const handleProductSpecificationSelect = () => {
    setSelectedTab(2);
  };

  const handleOpenImagesModal = () => {
    setShowImagesModal(true);
  };

  const handleLightBox = (index: number) => {
    // getProductImages returns plain URLs; the `.src` read is a defensive fallback for object entries.
    const images = ratingImages?.map((img) => ({
      src: (img as ProductImageObject)?.src ? (img as ProductImageObject)?.src : img,
    }));
    setLightBoxImages(images as Slide[]);
    setImageIndex(index);
    setShowLightbox(true);
  };

  const specifications = useMemo(() => getSpecificationRows(product), [product]);

  const hasSpecifications = specifications?.length > 0;

  // The tab disappears when a product has no custom-field values — fall back to
  // the description so the panel isn't left on a tab that no longer exists.
  useEffect(() => {
    if (!hasSpecifications && selectedTab === 2) {
      setSelectedTab(0);
    }
  }, [hasSpecifications, selectedTab]);

  // Counts are undefined until ratings load (the sums are NaN then, as before).
  const ratings = [
    { stars: 5, count: ratingData?.five_star_rating },
    { stars: 4, count: ratingData?.four_star_rating },
    { stars: 3, count: ratingData?.three_star_rating },
    { stars: 2, count: ratingData?.two_star_rating },
    { stars: 1, count: ratingData?.one_star_rating },
  ] as { stars: number; count: number }[];
  const totalRatings = ratings.reduce(
    (total, rating) => total + rating.count,
    0
  );
  const averageRating = (
    ratings.reduce((sum, { stars, count }) => sum + stars * count, 0) /
    totalRatings
  ).toFixed(1);

  return (
    <div>
      <div className="my-2">
        <div className="flex flex-wrap items-center gap-4 p-4 bg-[var(--surface-subtle)] rounded-tl-2xl rounded-tr-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
          <span
            className={`px-6 py-3 rounded-lg cursor-pointer text-base md:text-xl font-medium leading-7 transition-colors ${selectedTab == 0
              ? "bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)]"
              : "text-[var(--button-link-foreground-default)]"
              }`}
            onClick={handleProductDescSelect}
          >
            {t("product_desc_title")}
          </span>
          {product?.product_rating == true && (
            <span
              className={`px-6 py-3 rounded-lg cursor-pointer text-base md:text-xl font-medium leading-7 transition-colors ${selectedTab == 1
                ? "bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)]"
                : "text-[var(--button-link-foreground-default)]"
                }`}
              onClick={handleProductReviewSelect}
            >
              {t("rating_and_reviews")}
              {(ratingData?.rating_list?.length as number) > 0
                ? ` (${ratingData?.rating_list?.length})`
                : ""}
            </span>
          )}
          {hasSpecifications && (
            <span
              className={`px-6 py-3 rounded-lg cursor-pointer text-base md:text-xl font-medium leading-7 transition-colors ${selectedTab == 2
                ? "bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)]"
                : "text-[var(--button-link-foreground-default)]"
                }`}
              onClick={handleProductSpecificationSelect}
            >
              {t("product_specification")}
            </span>
          )}
        </div>
        <div className="bg-[var(--surface-default)] rounded-bl-2xl rounded-br-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
          {selectedTab == 0 ? (
            product?.description !== "" ? (
              <div className="p-4">
                <div
                  className="overflow-x-auto md:overflow-hidden api-html-content"
                  dangerouslySetInnerHTML={{ __html: product?.translations?.description as string }}
                />
              </div>
            ) : (
              <p className="p-4 text-[var(--foreground-secondary)]">{t("no_product_description")}</p>
            )
          ) : (
            <></>
          )}
          {selectedTab == 2 && hasSpecifications && (
              <div className="self-stretch p-6 flex flex-col justify-start items-start gap-6">
                {specifications.map((spec, index) => (
                  <div
                    key={index}
                    className={`self-stretch min-h-12 flex justify-start gap-2 ${
                      spec.type === "file" ? "items-start" : "items-center"
                    }`}
                  >
                    <div className="flex-1 flex flex-col justify-center items-start gap-0.5">
                      <span className="self-stretch text-[var(--foreground-secondary)] text-sm font-normal leading-5">
                        {spec.name}
                      </span>
                      {spec.type === "file" ? (
                        <a
                          href={spec.value}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block h-40 w-40 overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]"
                        >
                          <ImageWithPlaceholder
                            src={spec.value}
                            alt={spec.name}
                            width={160}
                            height={160}
                            className="h-full w-full object-contain"
                          />
                        </a>
                      ) : (
                        <span className="self-stretch text-[var(--foreground-primary)] text-base font-medium leading-6 break-words">
                          {spec.value}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          {selectedTab == 1 && (
            <div>
              <div>
                {totalRatings != 0 ? (
                  <div className="grid grid-cols-12">
                    {/* Section 1 */}
                    <div className="col-span-12 md:col-span-4 flex flex-col gap-6 p-4">
                      <div className="flex flex-col gap-2">
                      <h1 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                        {t("customer_reviews")}
                      </h1>
                      <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-4 bg-[var(--brand-background-subtle)] p-2 rounded-2xl">
                        <div className="size-14 shrink-0 flex justify-center items-center text-2xl font-bold leading-8 text-[var(--brand-foreground-inverse)] bg-[var(--brand-background-default)] rounded-2xl">
                          {ratingData?.average_rating?.toFixed(
                            setting?.decimal_point ? (setting?.decimal_point as number) : 0
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-1">
                          <p className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">
                            {t("overall_rating")}
                          </p>
                          <p className="text-xl font-bold leading-7 text-[var(--foreground-primary)]">
                            {totalRatings.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Star Ratings */}
                      <div className="flex flex-col gap-3">
                        {ratings.map(({ stars, count }) => {
                          const percentage = (count / totalRatings) * 100;

                          return (
                            <div
                              key={stars}
                              className="flex items-center gap-2"
                            >
                              <span className="w-8 shrink-0 flex items-center gap-1 text-sm font-medium leading-5 text-[var(--foreground-primary)]">
                                {stars}
                                <FaStar
                                  size={20}
                                  className="shrink-0 text-[var(--status-warning-default)]"
                                />
                              </span>
                              <Progress
                                value={percentage}
                                className="w-full h-[5px]"
                              />
                              <span className="w-12 text-right text-sm font-semibold leading-5 text-[var(--foreground-tertiary)]">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      </div>
                      </div>
                      {ratingImages?.length > 0 && (
                        <div className="flex flex-col gap-2 p-4 bg-[var(--surface-subtle)] rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                          <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                            {t("customer_photos")}
                          </p>
                          {/* Fixed 3-up grid: with flex-1 a single photo would
                              stretch across the whole row. */}
                          <div className="grid grid-cols-3 gap-4">
                            {ratingImages?.slice(0, 6)?.map((image, index) => {
                              return (
                                <div
                                  className="relative h-24 rounded-2xl overflow-hidden"
                                  key={index}
                                >
                                  <ImageWithPlaceholder
                                    src={image}
                                    alt="Rating image"
                                    className="h-full w-full object-cover cursor-pointer"
                                    handleOnClick={() => handleLightBox(index)}
                                    sizes="120px"
                                  />
                                  {index === 5 && (
                                    <div
                                      onClick={handleOpenImagesModal}
                                      className="absolute inset-0 bg-black/90 flex items-center justify-center text-[var(--foreground-inverse)] text-xl font-bold leading-7 cursor-pointer"
                                    >
                                      {`+${ratingImages?.length - 5}`}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-8 flex flex-col gap-6 p-4">
                      <h1 className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">
                        {t("customer_feedbacks")}
                      </h1>
                      <div className="flex flex-col gap-6">
                        {ratingData?.rating_list?.map((review, index) => {
                          return (
                            <ProductReviewCard review={review} key={index} />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center mx-auto gap-3">
                    <div className="relative ">
                      <ImageWithPlaceholder
                        src={NoReviewImage}
                        alt="No review found"
                        height={112}
                        width={112}
                      />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-[var(--foreground-primary)]">
                      {t("no_ratings_available_yet")}
                    </h2>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <RatingImagesModal
        showImagesModal={showImagesModal}
        setShowImagesModal={setShowImagesModal}
        images={ratingImages}
      />
      <RatingLightBox
        showLightBox={showLightBox}
        setShowLightbox={setShowLightbox}
        images={lightBoxImages}
        imageIndex={imageIndex}
      />
    </div>
  );
};

export default ProductDescription;
