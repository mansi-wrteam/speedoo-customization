import Image from 'next/image'

import React, { useEffect, useState } from 'react'
import { IoMdArrowBack, IoMdArrowForward } from 'react-icons/io'

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import VerticleProductCard from '../productcards/VerticleProductCard';
import { useSelector, useDispatch } from 'react-redux'
import { t } from '@/utils/translation'
import { setFilterSection, setListingSource, } from '@/redux/slices/productFilterSlice';
import { useRouter } from 'next/navigation'
import { isRtl } from '@/lib/utils'
import HomeOfferSection from './HomeOfferSection';
import ViewAllButton from '../view-all-button/ViewAllButton';
import type { AppDispatch } from '@/redux/hooks';
import type { RootState } from '@/types/state';
import type { Offer, Section } from '@/types/models';

export interface ProductSwiperWithImageProps {
    section: Section;
    /** Passed by FeatureSections; not read. */
    index: number;
}

const ProductSwiperWithImage = ({ section }: ProductSwiperWithImageProps) => {
    const router = useRouter();
    const rtl = isRtl()
    const dispatch = useDispatch<AppDispatch>();
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)
    const theme = useSelector((state: RootState) => state.Theme.theme)
    const shop = useSelector((state: RootState) => state.Shop.shop);
    const [promotionImage, setPromotionImage] = useState<Offer[] | null | undefined>(null)
    useEffect(() => {
        const promotionImageBelowSection = shop?.offers?.filter((offer) => offer?.position == "below_section");
        const image = promotionImageBelowSection?.filter((offer) => {
            return offer?.section?.id == section?.id
        })
        setPromotionImage(image)
    }, [section])


    const handleViewAll = () => {
        dispatch(setFilterSection({ data: section?.id }))
        dispatch(setListingSource({ data: "all" }));
        router.push('/products')
    }

    return (
        <div>
            {(section?.products?.length as number) > 0 ? (
                <section>
                    <div className='container feature-section'>
                        <div dir={language?.type} className='flex flex-col gap-6'>
                            {/* Header */}
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex-1 min-w-0 flex flex-col justify-center'>
                        <div className='flex justify-between'>
                            <h2 className='text-md md:text-2xl font-bold leading-8 text-[var(--foreground-primary)]'>{section?.translations?.title}</h2>
                            <span><ViewAllButton onClick={handleViewAll} className='flex md:hidden'/></span>
                        </div>
                        
                        <p className='text-sm md:text-base font-normal leading-6 text-[var(--foreground-tertiary)]'>{section?.translations?.short_description}</p>
                    </div>
                                <div className='flex shrink-0 justify-end items-center gap-4'>
                                    <ViewAllButton onClick={handleViewAll} className='hidden md:flex'/>
                                    <div className={`md:flex hidden items-center gap-2 ${language?.type == "RTL" ? "flex-row-reverse" : ""}`}>
                                        <button className={`prev-btn-${section?.id} p-2.5 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-strong)] flex justify-center items-center transition-colors hover:bg-[var(--surface-hover)]`}><IoMdArrowBack className='text-[var(--foreground-tertiary)]' size={20} /></button>
                                        <button className={`next-btn-${section?.id} p-2.5 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-strong)] flex justify-center items-center transition-colors hover:bg-[var(--surface-hover)]`}><IoMdArrowForward className='text-[var(--foreground-tertiary)]' size={20} /></button>
                                    </div>
                                </div>
                            </div>
                            {/* Body: image card + products (dynamic background) */}
                            <div className='flex flex-col md:flex-row items-stretch gap-6 image-card'>
                                {/* Image card */}
                                <div className='relative w-full md:w-60 shrink-0 self-stretch rounded-2xl overflow-hidden bg-[var(--surface-subtle)] h-80 md:h-auto md:min-h-0'>
                                    <Image src={section?.banner_web_url as string} fill sizes="(max-width: 768px) 100vw, 240px" priority={true} fetchPriority="high" quality={85} alt={section?.translations?.title as string} className='object-fit' />
                                </div>
                                {/* Products with dynamic background */}
                                <div className='flex-1 min-w-0 p-4 md:p-6 rounded-2xl overflow-hidden' style={theme == "light" ? { backgroundColor: section?.background_color_for_light_theme as string | undefined } : { backgroundColor: section?.background_color_for_dark_theme as string | undefined }}>
                                    {/* Mobile: grid (swiper hidden) */}
                                    {/* <div className='grid grid-cols-3 gap-3 md:hidden'>
                                        {section?.products?.slice(0, 6).map((product) => (
                                            <VerticleProductCard key={product.id} product={product} />
                                        ))}
                                    </div> */}
                                    {/* Desktop/Tablet: swiper */}
                                    <div className=' md:block'>
                                    <Swiper
                                        key={rtl as unknown as string}
                                        spaceBetween={24}
                                        modules={[Navigation]}
                                        navigation={
                                            {
                                                prevEl: `.prev-btn-${section?.id}`,
                                                nextEl: `.next-btn-${section?.id}`
                                            }
                                        }
                                        className="brand-swiper"
                                        breakpoints={{
                                            1200: { slidesPerView: 5.5 },
                                            1024: { slidesPerView: 4.5 },
                                            768: { slidesPerView: 2.5 },
                                            500: { slidesPerView: 2.5 },
                                            300: { slidesPerView: 2.5 },
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
                        </div>
                    </div>
                </section>
            ) : null}
            {promotionImage && promotionImage?.map((offer, index) => {
                return (
                    <div className='container mb-6' key={index}>
                        <div className='relative' key={offer?.id}>
                            <HomeOfferSection offer={offer} />
                        </div>
                    </div>
                )
            })}
        </div>


    )
}

export default ProductSwiperWithImage