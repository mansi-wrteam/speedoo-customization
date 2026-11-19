import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { t } from "@/utils/translation";
import VerticleProductCard from "../productcards/VerticleProductCard";
import * as api from "@/api/apiRoutes";
import { useSelector } from "react-redux";
import { isRtl } from "@/lib/utils";
import { IoMdArrowBack, IoMdArrowForward } from "react-icons/io";
import type { Product } from "@/types/models/product";
import type { RootState } from "@/types/state";

export interface RecentalyViewedProductsProps {
  recentalyViewedProducts: Product[];
}

const RecentalyViewedProducts = ({ recentalyViewedProducts }: RecentalyViewedProductsProps) => {
  const rtl = isRtl();
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  return recentalyViewedProducts?.length > 0 ? (
    <section className="bg-[var(--surface-default)] border-t border-[var(--border-subtle)]">
      <div className="container py-10 px-2" dir={language?.type}>
        <div
          className={`flex flex-col gap-6 ${
            language?.type == "RTL" ? "flex-row-reverse" : ""
          }`}
        >
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-md md:text-2xl font-bold leading-8 text-[var(--foreground-primary)]">
              {t("recentaly_products")}
            </h2>
            <div
               className={` flex  gap-2 ${language?.type == "RTL" ? "flex-row-reverse" : ""}`}
            >
                <button className="category-button-next1 p-2.5 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-strong)] flex justify-center items-center transition-colors hover:bg-[var(--surface-hover)]">
                <IoMdArrowBack className="text-[var(--foreground-tertiary)]" size={20} />
                </button>
                <button className="category-button-prev1 p-2.5 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-strong)] flex justify-center items-center transition-colors hover:bg-[var(--surface-hover)]">
                <IoMdArrowForward className="text-[var(--foreground-tertiary)]" size={20} />
                </button>
            </div>
          </div>
          <div>
            <Swiper
              key={rtl as unknown as string}
              spaceBetween={20}
              modules={[Navigation]}
              className="brand-swiper"
              navigation={{
                nextEl: ".category-button-prev1",
                prevEl: ".category-button-next1",
              }}
              //   onReachEnd={handleLoadMore}
              breakpoints={{
                1200: {
                  slidesPerView: 6.5,
                  spaceBetween: 10,
                },
                1024: {
                  slidesPerView: 5.5,
                  spaceBetween: 10,
                },
                768: {
                  slidesPerView: 4.3,
                  spaceBetween: 10,
                },
                500: {
                  slidesPerView: 3.5,
                  spaceBetween: 10,
                },
                300: {
                  slidesPerView: 3.5,
                  spaceBetween: 10,
                },
              }}
            >
              {recentalyViewedProducts?.map((product, index) => (
                <SwiperSlide
                  key={product.id}
                  className={
                    index === recentalyViewedProducts.length - 1
                      ? "last-slide"
                      : ""
                  }
                >
                  <VerticleProductCard product={product} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  ) : null;
};

export default RecentalyViewedProducts;
