import { useEffect, useState } from 'react'
import { t } from "@/utils/translation"
import * as api from "@/api/apiRoutes"
import { useSelector } from 'react-redux'
import WishlistCard from '../productcards/WishlistCard'
import CardSkeleton from '../skeleton/CardSkeleton'
import NoWishListImage from "@/assets/not_found_images/Empty_Wishlist.svg"
import Image from 'next/image'
import type { Product } from '@/types/models'
import type { RootState } from '@/types/state'

const Wishlist = () => {
    const city = useSelector((state: RootState) => state.City.city)
    const [wishlistProducts, setWishlistProducts] = useState<Product[]>([])
    const [offset, setOffset] = useState(0)
    const [loading, setLoading] = useState(false)
    // null until the first response; `response.total` can be missing (undefined).
    const [total, setTotal] = useState<number | null | undefined>(null)


    const itemPerPage = 10;

    useEffect(() => {
        handleFetchLikedProducts();
    }, [])


    const handleFetchLikedProducts = async (isAppend = false, fetchOffset = offset) => {
        setLoading(true)
        try {
            const response = await api.getFavorite({ latitude: city?.latitude, longitude: city!.longitude, limit: itemPerPage, offset: fetchOffset })
            if (response.status == 1) {
                setWishlistProducts(isAppend ? state => [...state, ...response.data] : response.data)
                setLoading(false)
                setTotal(response.total)
            } else {
                setLoading(false)
                setTotal(0)
            }
        } catch (error) {
            setLoading(false)
            console.log("Error", error)
        }
    }


    const handleLoadMore = () => {
        const nextOffset = offset + itemPerPage;
        handleFetchLikedProducts(true, nextOffset)
        setOffset(nextOffset);
    }



    return (

        <div className='w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]'>
            <div className='flex justify-between items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4'>
                <h2 className='flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]'>{t("wishlist")}</h2>
            </div>
            <div className="overflow-auto">
                {loading ?
                    Array?.from({ length: 6 })?.map((_, index) => {
                        return (
                            <CardSkeleton height={200} padding="3px" key={index} />
                        )
                    })
                    : wishlistProducts?.length > 0 ? wishlistProducts?.map((prdct) => {
                        return (
                            <div key={prdct?.id}>
                                <WishlistCard product={prdct} setWishlistProducts={setWishlistProducts} wishlistProducts={wishlistProducts} setTotal={setTotal as React.Dispatch<React.SetStateAction<number>>} handleFetchLikedProducts={handleFetchLikedProducts} />
                            </div>
                        )
                    }) : <div className=' col-span-12 h-full w-full flex items-center justify-center flex-col gap-2 p-2'>
                        <Image src={NoWishListImage} alt='Your wishlist is Empty' height={302} width={302} unoptimized className='h-1/2 w-1/2' />
                        <h2 className='text-2xl font-bold text-[var(--foreground-primary)]'>{t("enter_wishlist_message")}</h2>
                    </div>}
                {((total as number) > wishlistProducts?.length) &&
                    <div className='flex justify-center p-4'>
                        <button onClick={handleLoadMore} className='rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]'>{t("load_more")}</button>
                    </div>
                }
            </div>

        </div>


    )
}

export default Wishlist