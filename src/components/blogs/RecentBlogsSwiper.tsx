import React from "react";
import { IoMdArrowBack, IoMdArrowForward } from "react-icons/io";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useSelector } from "react-redux";
import { t } from "@/utils/translation";
import BlogCard from "./BlogCard";
import { isRtl } from "@/lib/utils";
import type { RootState } from "@/types/state";
import type { Blog } from "@/types/models";

export interface RecentBlogsSwiperProps {
  recentBlogs: Blog[];
}

const RecentBlogsSwiper = ({ recentBlogs }: RecentBlogsSwiperProps) => {
  const language = useSelector((state: RootState) => state.Language.selectedLanguage);
  const rtl = isRtl();

  return (
    <div>
      {recentBlogs?.length > 0 ? (
        <section className="bg-[var(--surface-default)]">
          <div className="container feature-section">
            <div dir={language?.type}>
              <div className="flex justify-between items-center mb-3 ">
                <div className="w-full md:w-1/2">
                  <h2 className="m-0 text-xl sm:text-2xl font-bold leading-8 text-[var(--foreground-primary)]">
                    {t("recentlyAddedBlogs")}
                  </h2>
                  <p className="text-base font-normal leading-6 text-[var(--foreground-tertiary)]">
                    {t("recentlyAddedBlogsDesc")}
                  </p>
                </div>
                <div className="flex  gap-0 md:gap-4 items-center flex-col md:flex-row">
                  <div
                    className={` md:flex hidden gap-2 ${
                      language?.type == "RTL" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <button
                      className="prev-blog-1 group rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors duration-200 ease-linear hover:bg-[var(--button-outline-background-hover)]"
                    >
                      <IoMdArrowBack
                        className="text-[var(--foreground-tertiary)] transition-colors duration-200 group-hover:text-[var(--button-outline-foreground-hover)]"
                        size={20}
                      />
                    </button>
                    <button
                      className="next-blog-1 group rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors duration-200 ease-linear hover:bg-[var(--button-outline-background-hover)]"
                    >
                      <IoMdArrowForward
                        className="text-[var(--foreground-tertiary)] transition-colors duration-200 group-hover:text-[var(--button-outline-foreground-hover)]"
                        size={20}
                      />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Swiper
                  key={rtl as unknown as string}
                  spaceBetween={20}
                  modules={[Navigation]}
                  className="brand-swiper"
                  navigation={{
                    prevEl: `.prev-blog-1`,
                    nextEl: `.next-blog-1`,
                  }}
                  breakpoints={{
                    1200: {
                      slidesPerView: 3,
                      spaceBetween: 10,
                    },
                    1024: {
                      slidesPerView: 3,
                      spaceBetween: 10,
                    },
                    768: {
                      slidesPerView: 2,
                      spaceBetween: 10,
                    },
                    500: {
                      slidesPerView: 1.5,
                      spaceBetween: 10,
                    },
                    300: {
                      slidesPerView: 1,
                      spaceBetween: 10,
                    },
                  }}
                >
                  {recentBlogs?.map((blog, index) => (
                    <SwiperSlide key={blog.id} className="h-auto">
                      <BlogCard blog={blog} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default RecentBlogsSwiper;
