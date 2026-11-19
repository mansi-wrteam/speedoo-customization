import React, { useEffect, useState } from 'react'
import { useServerData } from '@/utils/useServerData'
import BreadCrumb from '../breadcrumb/BreadCrumb'
import * as api from '@/api/apiRoutes'
import { useDispatch, useSelector } from 'react-redux'
import { setFilterByCountry } from '@/redux/slices/productFilterSlice'
import { useRouter } from 'next/router'
import Country from './Country'
import CardSkeleton from '../skeleton/CardSkeleton'
import { resolveCardBg } from '@/lib/utils'
import { useRedirectHomeOnModuleChange } from '@/utils/useRedirectHomeOnModuleChange'
import Image from 'next/image'
import { t } from '@/utils/translation'
import NoProductSvg from '@/assets/not_found_images/No_product_found.svg'
import type { AppDispatch } from "@/redux/hooks";
import type { RootState } from "@/types/state";
import type { Country as CountryModel } from "@/types/models/catalog";
const CountryListing = () => {
    const router = useRouter()
    const dispatch = useDispatch<AppDispatch>()
    const city = useSelector((state: RootState) => state.City.city);

    // A user module switch invalidates this module's countries → go home.
    useRedirectHomeOnModuleChange();
    const theme = useSelector((state: RootState) => state.Theme.theme);
    const isDark = theme === "dark";

    const countriesPerPage = 12;
    // Already fetched by the server (SSR_PLAN.md §3.5, channel 3).
    const serverCountries = useServerData<{
        data: CountryModel[];
        light: string | null;
        dark: string | null;
    }>("countries");

    const [countries, setCountries] = useState<CountryModel[] | undefined>(serverCountries?.data ?? [])
    const [countryGlobal, setCountryGlobal] = useState<{ light?: string | null; dark?: string | null }>(
        serverCountries ? { light: serverCountries.light, dark: serverCountries.dark } : {}
    )
    const [isLoading, setIsLoading] = useState(false)

    const handleFetchCountries = async () => {
        setIsLoading(true)
        try {
            const response = await api.getCountries({
                limit: countriesPerPage,
                offset: 0,
                latitude: city?.latitude,
                longitude: city?.longitude
            })
            console.log(response?.data);
            setCountries(response?.data);
            setCountryGlobal({
                light: response?.country_background_color_light_theme,
                dark: response?.country_background_color_dark_theme,
            });
        } catch (error) {
            console.log("Error:", error)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        // The server supplied the list, so refetching it on mount would only
        // flash the grid.
        if (serverCountries) return;
        handleFetchCountries()
    }, [])

    const handleCountryClick = (country: CountryModel) => {
        dispatch(setFilterByCountry({ data: country?.id }));
        router.push(`/products`)
    }

    return (
        <section>
            <BreadCrumb />
            <div className='container'>
                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 h-auto my-5 p-2`}>
                    {
                        countries && countries?.map((country) => {
                            return (
                                <div key={country?.id} className={"col-span-1"} onClick={() => handleCountryClick(country)}>
                                    <Country
                                        country={country}
                                        bgColor={resolveCardBg({
                                            item: country,
                                            globalLight: countryGlobal.light,
                                            globalDark: countryGlobal.dark,
                                            isDark,
                                        })}
                                    />
                                </div>

                            )
                        })
                    }
                    {/* The API can return no countries for a location; say so instead of a blank band. */}
                    {!isLoading && (countries?.length ?? 0) === 0 && (
                        <div className="col-span-full flex flex-col items-center gap-4 py-10 text-center">
                            <Image src={NoProductSvg} alt="" width={240} height={240} className="h-auto w-48 md:w-60" />
                            <p className="text-base text-[var(--foreground-secondary)]">{t("no_data_found")}</p>
                        </div>
                    )}
                    {isLoading && Array.from({ length: countriesPerPage }).map((_, index) => (
                        <div key={index}>
                            <CardSkeleton height={150} />
                        </div>
                    ))
                    }
                </div>

            </div>
        </section>
    )
}

export default CountryListing
