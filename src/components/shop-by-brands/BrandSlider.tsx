import ViewAllButton from '../view-all-button/ViewAllButton'
import React from 'react'
import { IoMdArrowBack, IoMdArrowForward } from 'react-icons/io'
import BrandCard from './BrandCard'
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { t } from "@/utils/translation"
import { useDispatch, useSelector } from 'react-redux';
import { setFilterBrands } from '@/redux/slices/productFilterSlice';
import { setFilterSection,setListingSource, } from '@/redux/slices/productFilterSlice';
import { useRouter } from 'next/router';
import { isRtl, resolveCardBg } from '@/lib/utils';
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Brand, ShopData } from "@/types/models/catalog";

export interface BrandSliderProps {
    /** Home `shop` payload (brand list + list-level background settings). */
    brands?: ShopData | null;
}
const BrandSlider = ({ brands }: BrandSliderProps) => {
    const rtl = isRtl();
    const dispatch = useDispatch<AppDispatch>()
    const router = useRouter()
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)
    const theme = useSelector((state: RootState) => state.Theme.theme)
    const isDark = theme === "dark"
    const bgMode = brands?.brand_background_color_mode
    const bgGlobalLight = brands?.brand_background_color_light_theme
    const bgGlobalDark = brands?.brand_background_color_dark_theme
    const getBrandBg = (brand: Brand) => resolveCardBg({ mode: bgMode, item: brand, globalLight: bgGlobalLight, globalDark: bgGlobalDark, isDark })
    const handleBrandClick = (brand: Brand) => {
        dispatch(setFilterBrands({ data: [brand?.id] }))
        dispatch(setListingSource({ data: "all" }));
        router.push(`/products`)
    }

    return (
        <section>
            <div className='container feature-section' dir={language?.type}>
                <div className='flex flex-col gap-6'>
                    <div className='flex items-center justify-between gap-4'>
                        <div className='flex flex-1 min-w-0 flex-col justify-center'>
                            <div className='flex justify-between'>
                            <h2 className='m-0 text-md md:text-2xl font-bold leading-8 text-[var(--foreground-primary)]'>{t("shop_by")} {t("brands")} </h2>
                            <span><ViewAllButton href="/countries" className='block md:hidden'/></span>
                            </div>
                            <p className='text-sm md:text-base font-normal leading-6 text-[var(--foreground-tertiary)]'>{t("brand_section_description")}</p>
                        </div>
                        <div className='flex items-center justify-end gap-4'>
                            <ViewAllButton href="/brands" className='hidden md:flex'/>
                            <div className={`hidden items-center gap-2 md:flex ${language?.type == "RTL" ? "flex-row-reverse" : ""}`}>
                                <button className='brand-slider-prev flex items-center justify-center rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors hover:bg-[var(--surface-hover)]'>
                                    <IoMdArrowBack className='text-[var(--foreground-tertiary)]' size={20} />
                                </button>
                                <button className='brand-slider-next flex items-center justify-center rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors hover:bg-[var(--surface-hover)]'>
                                    <IoMdArrowForward className='text-[var(--foreground-tertiary)]' size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className='overflow-hidden'>
                        {/* Desktop/Tablet: swiper */}
                        <div className='hidden md:block'>
                            <Swiper
                                // React stringifies the boolean key; the typings only accept string | number.
                                key={rtl as unknown as string}
                                slidesPerView={1.5}
                                spaceBetween={24}
                                modules={[Navigation]}
                                navigation={{
                                    prevEl: ".brand-slider-prev",
                                    nextEl: ".brand-slider-next"
                                }}
                                className="brand-swiper"
                                breakpoints={{
                                    768: { slidesPerView: 5.5, spaceBetween: 16 },
                                    1024: { slidesPerView: 6, spaceBetween: 24 },
                                    1300: { slidesPerView: 8, spaceBetween: 24 }
                                }}
                            >
                                {brands?.brands?.map((brand, index) => (
                                    <SwiperSlide key={index} onClick={() => handleBrandClick(brand)} className='h-auto'>
                                        <BrandCard brand={brand} bgColor={getBrandBg(brand)} />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                        {/* Mobile: 4-column grid */}
                        <div className='grid grid-cols-4 justify-items-center gap-3 md:hidden'>
                            {brands?.brands?.slice(0, 8).map((brand, index) => (
                                <div className='flex w-full justify-center' key={index} onClick={() => handleBrandClick(brand)}>
                                    <BrandCard brand={brand} bgColor={getBrandBg(brand)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default BrandSlider
