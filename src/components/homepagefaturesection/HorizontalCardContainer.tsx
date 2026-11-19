import React, { useEffect, useState } from 'react'
import HorizontalProductCard from '../productcards/HorizontalProductCard'
import { useSelector } from 'react-redux';
import Image from 'next/image';
import { useDispatch } from 'react-redux';
import { setFilterSection, setListingSource, } from '@/redux/slices/productFilterSlice';
import { t } from '@/utils/translation';
import { useRouter } from 'next/navigation';
import HomeOfferSection from './HomeOfferSection';
import ViewAllButton from '../view-all-button/ViewAllButton';
import type { AppDispatch } from '@/redux/hooks';
import type { RootState } from '@/types/state';
import type { Offer, Section } from '@/types/models';

export interface HorizontalCardContainerProps {
    section: Section;
    /** Passed by FeatureSections; not read. */
    index: number;
}

const HorizontalCardContainer = ({ section }: HorizontalCardContainerProps) => {

    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
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



    // No background colour configured → drop the inner padding so the grid sits
    // flush with the rest of the section.
    const sectionBg = theme == "light"
        ? section?.background_color_for_light_theme
        : section?.background_color_for_dark_theme;

    const handleViewAll = () => {
        dispatch(setFilterSection({ data: section?.id }))
        dispatch(setListingSource({ data: "all" }));
        router.push('/products')
    }

    return (
        <section>
            {(section?.products?.length as number) > 0 ? <div className='container feature-section'>
                <div className='flex justify-between items-center gap-4 mb-6'>
                    <div className='flex-1 min-w-0 flex flex-col justify-center'>
                        <div className='flex justify-between'>
                            <h2 className='text-md md:text-2xl font-bold leading-8 text-[var(--foreground-primary)]'>{section?.translations?.title}</h2>
                            <span><ViewAllButton onClick={handleViewAll} className='flex md:hidden'/></span>
                        </div>
                        
                        <p className='text-sm md:text-base font-normal leading-6 text-[var(--foreground-tertiary)]'>{section?.translations?.short_description}</p>
                    </div>

                    <div className='flex shrink-0 justify-end items-center gap-4'>
                        <ViewAllButton onClick={handleViewAll} className='hidden md:flex'/>
                    </div>
                </div>
                <div className={`grid grid-cols-4 sm:grid-cols-8 md:grid-cols-8 lg:grid-cols-12 mt-6 rounded-2xl gap-4 md:gap-4 ${sectionBg ? "p-4 md:p-6" : ""}`} style={{ backgroundColor: sectionBg as string | undefined }}>
                    {section?.products?.slice(0, 6)?.map((product, index) => {
                        return (
                            <div key={index} className='col-span-4 '>
                                <HorizontalProductCard product={product} />
                            </div>
                        )
                    })}
                </div>
            </div> : null}
            <div className='container'>
                {promotionImage && promotionImage?.map((offer) => {
                    return (
                        <div className='relative w-full' key={offer?.id}>
                            <HomeOfferSection offer={offer} />
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

export default HorizontalCardContainer