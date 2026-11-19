import React, { useEffect, useState } from 'react'
import { useServerData } from '@/utils/useServerData'
import BreadCrumb from '../breadcrumb/BreadCrumb'
import SellerListingCard from './SellerListingCard'
import * as api from '@/api/apiRoutes'
import { useDispatch, useSelector } from 'react-redux'
import { setFilterBySeller } from '@/redux/slices/productFilterSlice'
import { useRouter } from 'next/router'
import CardSkeleton from '../skeleton/CardSkeleton'
import { useRedirectHomeOnModuleChange } from '@/utils/useRedirectHomeOnModuleChange'
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Seller } from "@/types/models/catalog";
const SellerListing = () => {
    const router = useRouter()
    const dispatch = useDispatch<AppDispatch>()
    const city = useSelector((state: RootState) => state.City.city);

    // A user module switch invalidates this module's sellers → go home.
    useRedirectHomeOnModuleChange();

    // Already fetched by the server (SSR_PLAN.md §3.5, channel 3).
    const serverSellers = useServerData<Seller[]>("sellers");

    const [sellers, setSellers] = useState<Seller[] | undefined>(serverSellers ?? [])
    const [isLoading, setIsLoading] = useState(false)

    const handleFetchSellers = async () => {
        setIsLoading(true)
        try {
            const response = await api.getSellers({
                latitude: city?.latitude,
                longitude: city?.longitude
            })
            setSellers(response?.data);
        } catch (error) {
            console.log("Error:", error)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        // The server supplied the list, so refetching it on mount would only
        // flash the grid.
        if (serverSellers) return;
        handleFetchSellers()
    }, [])

    const handleSellerClick = (seller: Seller) => {
        dispatch(setFilterBySeller({ data: seller?.id }));
        router.push(`/products`)
    }

    return (
        <section>
            <BreadCrumb />
            <div className='container'>
                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 h-auto my-5 px-2`}>
                    {
                        sellers && sellers?.map((seller) => {
                            return (
                                <div key={seller?.id} className={"col-span-1"} onClick={() => handleSellerClick(seller)}>
                                    <SellerListingCard seller={seller} />
                                </div>

                            )
                        })
                    }
                    {isLoading && Array.from({length:6 }).map((_,idx)=> (
                        <div key={idx}>
                            <CardSkeleton height={150} /> 
                        </div>
                    ))
                    }
                </div>

            </div>
        </section>
    )
}

export default SellerListing
