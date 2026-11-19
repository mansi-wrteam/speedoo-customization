import React, { useEffect } from 'react'
import ProductDescription from '../productdetail/ProductDetail'
import Layout from '../layout/Layout'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const ProductDescriptionPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <ProductDescription />
        </Layout>
    )
}

export default ProductDescriptionPage