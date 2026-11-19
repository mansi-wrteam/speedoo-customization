import React, { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { t } from '@/utils/translation';
import VerticleProductCard from '../productcards/VerticleProductCard';
import * as api from "@/api/apiRoutes"
import { useSelector } from 'react-redux';
import { isRtl } from '@/lib/utils';
import { IoMdArrowBack, IoMdArrowForward } from "react-icons/io";
import type { Product } from '@/types/models/product';
import type { RootState } from '@/types/state';

export interface SimilarProductsProps {
    /** Product slug straight from `router.query` (sent as `tag_slug`). */
    slug?: string | string[];
    /** Comma-separated tags of the current product. */
    tag_names?: string | null;
}

const SimilarProducts = ({ slug, tag_names }: SimilarProductsProps) => {
    const rtl = isRtl()
    const city = useSelector((state: RootState) => state.City.city)
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    const [similarProducts, setSimilarProducts] = useState<Product[]>([])
    const [totalSimilarProducts, setTotalSimilarProducts] = useState<number | undefined>(0)
    const [offset, setOffset] = useState(0)


    const productPerPage = 10;

    useEffect(() => {
        if (tag_names && city) {
            handleFetchSimilarProducts(tag_names)
        }
    }, [offset, city])

    const handleFetchSimilarProducts = async (localTagNames: string) => {
        try {
            const response = await api.getProductByFilter({ latitude: city?.latitude, longitude: city?.longitude, tag_names: localTagNames, slug: slug as string })
            setSimilarProducts(response.data)
            setTotalSimilarProducts(response.total)
        } catch (error) {
            console.log("Error", error)
        }
    }

    const handleLoadMore = () => {
        if ((totalSimilarProducts as number) > similarProducts?.length) {
            setOffset(offset => offset + productPerPage)
        } else {
            return
        }
    }

    return (
        similarProducts?.length > 0 ?
            <section className='bg-[var(--surface-default)] border-t border-[var(--border-subtle)]'>
                <div className='container py-10 px-2' dir={language?.type}>
                    <div className={`flex flex-col gap-6 ${language?.type == "RTL" ? "flex-row-reverse" : ""}`} >
                        <div className='flex justify-between items-center gap-4'>
                            <h2 className='text-md md:text-2xl font-bold leading-8 text-[var(--foreground-primary)]'>{t("related_product")}</h2>
                            <div
                                className={` flex  gap-2 ${language?.type == "RTL" ? "flex-row-reverse" : ""}`}
                            >
                                <button className="category-button-next p-2.5 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-strong)] flex justify-center items-center transition-colors hover:bg-[var(--surface-hover)]">
                                    <IoMdArrowBack className="text-[var(--foreground-tertiary)]" size={20} />
                                </button>
                                <button className="category-button-prev p-2.5 rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-strong)] flex justify-center items-center transition-colors hover:bg-[var(--surface-hover)]">
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
                                onReachEnd={handleLoadMore}
                                navigation={{
                                    nextEl: ".category-button-prev",
                                    prevEl: ".category-button-next",
                                }}
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
                                        slidesPerView: 3.5,
                                        spaceBetween: 10
                                    },
                                    300: {
                                        slidesPerView: 3.5,
                                        spaceBetween: 10
                                    },
                                }}
                            >
                                {similarProducts?.map((product, index) => (
                                    <SwiperSlide
                                        key={product.id}
                                        className={index === similarProducts.length - 1 ? 'last-slide' : ''}
                                    >
                                        <VerticleProductCard product={product} />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>

                </div>
            </section>
            : null
    )
}

export default SimilarProducts