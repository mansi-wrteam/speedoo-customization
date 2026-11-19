import ViewAllButton from '../view-all-button/ViewAllButton'
import React from 'react'
import { IoMdArrowBack, IoMdArrowForward } from 'react-icons/io'
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import Country from './Country';
import { t } from '@/utils/translation';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { isRtl, resolveCardBg } from '@/lib/utils';
import { setFilterByCountry } from '@/redux/slices/productFilterSlice';
import { setFilterSection,setListingSource, } from '@/redux/slices/productFilterSlice';
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Country as CountryModel, ShopData } from "@/types/models/catalog";

export interface CountrySliderProps {
    /** Home `shop` payload (country list + list-level background settings). */
    countries?: ShopData | null;
}

const CountrySlider = ({ countries }: CountrySliderProps) => {
    const router = useRouter()
    const rtl = isRtl();
    const dispatch = useDispatch<AppDispatch>()
    const handleCountryClick = (country: CountryModel) => {
        dispatch(setFilterByCountry({ data: country?.id }));
        dispatch(setListingSource({ data: "all" }));
        router.push(`/products`)
    }

    const language = useSelector((state: RootState) => state.Language.selectedLanguage)
    const theme = useSelector((state: RootState) => state.Theme.theme)
    const isDark = theme === "dark"
    const bgMode = countries?.country_background_color_mode
    const bgGlobalLight = countries?.country_background_color_light_theme
    const bgGlobalDark = countries?.country_background_color_dark_theme
    const getCountryBg = (country: CountryModel) => resolveCardBg({ mode: bgMode, item: country, globalLight: bgGlobalLight, globalDark: bgGlobalDark, isDark })

    return (
        <section>
            <div className='container feature-section'>
                <div className='flex flex-col gap-6' dir={language?.type}>
                    <div className='flex items-center justify-between gap-4'>
                        <div className='flex flex-1 min-w-0 flex-col justify-center'>
                            <div className='flex justify-between'>
                            <h2 className='m-0 text-md md:text-2xl font-bold leading-8 text-[var(--foreground-primary)]'>{t("shop_by")} {t("countries")} </h2>
                            <span><ViewAllButton href="/countries" className='block md:hidden'/></span>
                            </div>
                            <p className='text-sm md:text-base font-normal leading-6 text-[var(--foreground-tertiary)]'>{t("seller_section_description")}</p>
                        </div>
                        <div className='flex items-center justify-end gap-4 text-nowrap'>
                            <ViewAllButton href="/countries" className='hidden md:flex'/>
                            <div className={`hidden items-center gap-2 md:flex ${language?.type == "RTL" ? "flex-row-reverse" : ""}`}>
                                <button className='country-slider-prev flex items-center justify-center rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors hover:bg-[var(--surface-hover)]'>
                                    <IoMdArrowBack className='text-[var(--foreground-tertiary)]' size={20} />
                                </button>
                                <button className='country-slider-next flex items-center justify-center rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors hover:bg-[var(--surface-hover)]'>
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
                                className="brand-swiper"
                                navigation={{
                                    prevEl: ".country-slider-prev",
                                    nextEl: ".country-slider-next"
                                }}
                                breakpoints={{
                                    768: { slidesPerView: 5.5, spaceBetween: 16 },
                                    1024: { slidesPerView: 6, spaceBetween: 24 },
                                    1300: { slidesPerView: 8, spaceBetween: 24 }
                                }}
                            >
                                {countries?.countries?.map((country, index) => (
                                    <SwiperSlide key={country.id} onClick={() => handleCountryClick(country)} className='h-auto'>
                                        <Country country={country} bgColor={getCountryBg(country)} />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                        {/* Mobile: 4-column grid */}
                        <div className='grid grid-cols-4 justify-items-center gap-3 md:hidden'>
                            {countries?.countries?.slice(0, 8).map((country, index) => (
                                <div className='flex w-full justify-center' key={country.id} onClick={() => handleCountryClick(country)}>
                                    <Country country={country} bgColor={getCountryBg(country)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default CountrySlider
