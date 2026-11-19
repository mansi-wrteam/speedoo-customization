import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { IoMdArrowBack, IoMdArrowForward } from "react-icons/io";
import CategoryCard from "./CategoryCard";
import { t } from "@/utils/translation";
import { useSelector } from "react-redux";
import { resolveCardBg } from "@/lib/utils";

import type { Category } from "@/types/models/catalog";
import type { RootState } from "@/types/state";

import "swiper/css";
import "swiper/css/navigation";

export interface SubCategorySwiperProps {
  title?: string | null;
  subCategories: Category[];
  isLoading?: boolean;
  /** "ltr" | "rtl", used as the container's dir attribute. */
  languageType?: string;
  /** Used as the Swiper key so it remounts when the direction flips. */
  rtl?: boolean;
  onCategoryClick: (category: Category) => void;
  globalBgLight?: string | null;
  globalBgDark?: string | null;
}

const SubCategorySwiper = ({
  title,
  subCategories,
  isLoading,
  languageType,
  rtl,
  onCategoryClick,
  globalBgLight,
  globalBgDark,
}: SubCategorySwiperProps) => {
  const isDark = useSelector((state: RootState) => state.Theme.theme) === "dark";

  if (!subCategories.length) return null;

  return (
    <>
      <div className="flex justify-between gap-4">
        {title && (
          <div className="m-0 text-xl font-bold leading-8 text-[var(--foreground-primary)]">
            <p>{title}</p>
          </div>
        )}
        <div className="flex  items-center p-0">
          <div className="flex gap-2">
            <button className="category-button-next group rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors duration-200 hover:bg-[var(--button-outline-background-hover)]">
              <IoMdArrowBack
                size={20}
                className="text-[var(--foreground-tertiary)] transition-colors duration-200 group-hover:text-[var(--button-outline-foreground-hover)]"
              />
            </button>
            <button className="category-button-prev group rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors duration-200 hover:bg-[var(--button-outline-background-hover)]">
              <IoMdArrowForward
                size={20}
                className="text-[var(--foreground-tertiary)] transition-colors duration-200 group-hover:text-[var(--button-outline-foreground-hover)]"
              />
            </button>
          </div>
        </div>
      </div>

      <div className="container" dir={languageType}>
        <div className="">
          <Swiper
            // React stringifies the boolean key; the typings only accept string | number.
            key={rtl as unknown as string}
            modules={[Navigation]}
            spaceBetween={20}
            slidesPerView={1.5}
            navigation={{
              nextEl: ".category-button-prev",
              prevEl: ".category-button-next",
            }}
            breakpoints={{
              0: { slidesPerView: 2 },
              320: { slidesPerView: 2.5 },
              375: { slidesPerView: 2.5 },
              425: { slidesPerView: 3 },
              768: { slidesPerView: 4 },
              1024: { slidesPerView: 6 },
            }}
          >
            {isLoading ? (
              <SwiperSlide>
                <div className="p-4 text-sm opacity-60">{t("loading")}</div>
              </SwiperSlide>
            ) : (
              subCategories.map((category) => (
                <SwiperSlide
                  key={category.id}
                  onClick={() => onCategoryClick(category)}
                >
                  <CategoryCard
                    category={category}
                    imageSize={96}
                    padding={8}
                    bgColor={resolveCardBg({
                      item: category,
                      globalLight: globalBgLight,
                      globalDark: globalBgDark,
                      isDark,
                    })}
                  />
                </SwiperSlide>
              ))
            )}
          </Swiper>
        </div>
      </div>
    </>
  );
};

export default SubCategorySwiper;
