import React, { useEffect, useState } from 'react'
import { IoMdArrowBack, IoMdArrowForward } from 'react-icons/io'
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import VerticleProductCard from '../productcards/VerticleProductCard';
import { useSelector } from 'react-redux';
import Image from 'next/image';
import { useDispatch } from 'react-redux';
import { setFilterSection, setListingSource, } from '@/redux/slices/productFilterSlice';

import { useRouter } from 'next/router';
import { t } from '@/utils/translation';
import { isRtl } from '@/lib/utils';
import HomeOfferSection from './HomeOfferSection';
import ViewAllButton from '../view-all-button/ViewAllButton';
import type { AppDispatch } from '@/redux/hooks';
import type { RootState } from '@/types/state';
import type { Offer, Section } from '@/types/models';

export interface HorizontalProductSwiperProps {
    section: Section;
    /** Position in the section list (destructured but not read). */
    index: number;
}

const HorizontalProductSwiper = ({ section, index }: HorizontalProductSwiperProps) => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const rtl = isRtl()
    const shop = useSelector((state: RootState) => state.Shop.shop);
    const theme = useSelector((state: RootState) => state.Theme.theme)
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)
    const [promotionImage, setPromotionImage] = useState<Offer[] | null | undefined>(null)
    useEffect(() => {
        const promotionImageBelowSection = shop?.offers?.filter((offer) => offer?.position == "below_section");
        const image = promotionImageBelowSection?.filter((offer) => {
            return offer?.section?.id == section?.id
        })
        setPromotionImage(image)
    }, [section])

    // No background colour configured → drop the inner padding so the swiper
    // sits flush with the rest of the section.
    const sectionBg = theme == "light"
        ? section?.background_color_for_light_theme
        : section?.background_color_for_dark_theme;

    const handleViewAll = () => {
        dispatch(setFilterSection({ data: section?.id }))
        dispatch(setListingSource({ data: "all" }));
        router.push("/products")
    }

    return (
        <div>
            {
                (section?.products?.length as number) > 0 ?
                    <section className='' >

                        <div className='container feature-section'>
                            <div dir={language?.type}>
                                <div className='flex justify-between items-center gap-4 mb-6'>
                                    <div className='flex-1 min-w-0 flex flex-col justify-center'>
                        <div className='flex justify-between'>
                            <h2 className='text-md md:text-2xl font-bold leading-8 text-[var(--foreground-primary)]'>{section?.translations?.title}</h2>
                            <span><ViewAllButton onClick={handleViewAll} className='flex md:hidden'/></span>
                        </div>
                        
                        <p className='text-sm md:text-base font-normal leading-6 text-[var(--foreground-tertiary)]'>{section?.translations?.short_description}</p>
                    </div>
                                    <div className='flex shrink-0 justify-end gap-0 md:gap-4 items-center flex-col md:flex-row'>
                                       <ViewAllButton onClick={handleViewAll} className='hidden md:flex'/>
                                        <div className={` md:flex hidden items-center gap-2 ${language?.type == "RTL" ? "flex-row-reverse" : ""}`} >
                                            <button className={`prev-btn-${section?.id} p-2.5 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-strong)] flex justify-center items-center transition-colors hover:bg-[var(--surface-hover)]`}>
                                                <IoMdArrowBack className='text-[var(--foreground-tertiary)]' size={20} />
                                            </button>
                                            <button className={`next-btn-${section?.id} p-2.5 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-strong)] flex justify-center items-center transition-colors hover:bg-[var(--surface-hover)]`}>
                                                <IoMdArrowForward className='text-[var(--foreground-tertiary)]' size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className={`mt-6 rounded-2xl overflow-hidden ${sectionBg ? "p-4 md:p-6" : ""}`} style={{ backgroundColor: sectionBg as string | undefined }}>
                                    <Swiper
                                        key={rtl as unknown as string}
                                        spaceBetween={20}
                                        modules={[Navigation]}
                                        className="brand-swiper"
                                        navigation={
                                            {
                                                prevEl: `.prev-btn-${section?.id}`,
                                                nextEl: `.next-btn-${section?.id}`
                                            }
                                        }
                                        breakpoints={{

                                            1200: {
                                                slidesPerView: 6.5,
                                                spaceBetween: 10
                                            },
                                            1024: {
                                                slidesPerView: 5.5,
                                                spaceBetween: 10
                                            },
                                            768: {
                                                slidesPerView: 4.3,
                                                spaceBetween: 10
                                            },
                                            500: {
                                                slidesPerView: 4.3,
                                                spaceBetween: 10
                                            },
                                            300: {
                                                slidesPerView: 2.5,
                                                spaceBetween: 10
                                            },
                                        }}
                                    >
                                        {section?.products?.map((product, index) => (
                                            <SwiperSlide key={product.id} className='h-auto'>
                                                <VerticleProductCard product={product} />
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            </div>
                        </div>
                    </section>
                    : null
            }
            {promotionImage && promotionImage?.map((offer) => {
                return (
                    <div className='container mb-6' key={offer?.id}>
                        <div className='relative' >
                            <HomeOfferSection offer={offer} />
                        </div>
                    </div>
                )
            })}
        </div>


    )
}

export default HorizontalProductSwiper