import React, { useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import ProductsList from '@/components/productslist/ProductsList'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'
const Productpage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <ProductsList />
        </Layout>
    )
}

export default Productpage