import ViewAllButton from '../view-all-button/ViewAllButton'
import React from 'react'
import { IoMdArrowBack, IoMdArrowForward } from 'react-icons/io'
import Seller from './Seller'
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { t } from '@/utils/translation';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { setFilterBySeller, setListingSource } from '@/redux/slices/productFilterSlice';
import { useSelector } from 'react-redux';
import { isRtl } from '@/lib/utils';
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Seller as SellerModel, ShopData } from "@/types/models/catalog";

export interface SellerSliderProps {
    /** Home `shop` payload (seller list). */
    sellers?: ShopData | null;
}


const SellerSlider = ({ sellers }: SellerSliderProps) => {
    const rtl = isRtl();
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();

    const handleSellerClick = (seller: SellerModel) => {
        dispatch(setFilterBySeller({ data: seller?.id }));
        dispatch(setListingSource({ data: "all" }));
        router.push("/products")
    }

    return (
        <section>
            <div className='container feature-section'>
                <div className='flex flex-col gap-6 rounded-2xl bg-[var(--surface-subtle)] p-4 md:p-6' dir={language?.type}>
                    <div className='flex items-center justify-between gap-4'>
                        <div className='flex flex-1 min-w-0 flex-col justify-center'>
                            <div className='flex justify-between'>
                            <h2 className='m-0 text-md md:text-2xl font-bold leading-8 text-[var(--foreground-primary)]'>{t("shop_by")} {t("seller")} </h2>
                            <span><ViewAllButton href="/countries" className='block md:hidden'/></span>
                            </div>
                            <p className='text-sm md:text-base font-normal leading-6 text-[var(--foreground-tertiary)]'>{t("seller_section_description")}</p>
                        </div>
                        {(sellers?.sellers?.length as number) > 4 &&
                            <div className='flex flex-col items-center justify-end gap-0 md:flex-row md:gap-4'>
                                <ViewAllButton href="/sellers" className='hidden md:flex'/>
                                <div className={`hidden items-center gap-2 md:flex ${language?.type == "RTL" ? "flex-row-reverse" : ""}`}>
                                    <button className='seller-slider-prev flex items-center justify-center rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors hover:bg-[var(--surface-hover)]'>
                                        <IoMdArrowBack className='text-[var(--foreground-tertiary)]' size={20} />
                                    </button>
                                    <button className='seller-slider-next flex items-center justify-center rounded-lg p-2.5 outline outline-1 -outline-offset-1 outline-[var(--border-strong)] transition-colors hover:bg-[var(--surface-hover)]'>
                                        <IoMdArrowForward className='text-[var(--foreground-tertiary)]' size={20} />
                                    </button>
                                </div>
                            </div>
                        }
                    </div>
                    <div className='overflow-hidden'>
                        <Swiper
                            // React stringifies the boolean key; the typings only accept string | number.
                            key={rtl as unknown as string}
                            spaceBetween={24}
                            modules={[Navigation]}
                            navigation={{
                                prevEl: ".seller-slider-prev",
                                nextEl: ".seller-slider-next"
                            }}
                            className="brand-swiper"
                            breakpoints={{
                                0: { slidesPerView: 1.2, spaceBetween: 12 },
                                320: { slidesPerView: 1.2, spaceBetween: 12 },
                                375: { slidesPerView: 1.5, spaceBetween: 16 },
                                640: { slidesPerView: 3, spaceBetween: 16 },
                                1024: { slidesPerView: 4, spaceBetween: 24 },
                            }}
                        >
                            {sellers?.sellers?.map((seller, index) => (
                                <SwiperSlide key={seller.id} onClick={() => handleSellerClick(seller)} className='h-auto'>
                                    <Seller seller={seller} />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default SellerSlider;
