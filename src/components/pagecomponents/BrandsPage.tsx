import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import Brands from '../shop-by-brands/Brand'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const BrandsPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <Brands />
        </Layout>
    )
}

export default BrandsPage
