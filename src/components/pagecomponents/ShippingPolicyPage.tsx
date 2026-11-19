import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import ShippingPolicy from '../shipping-policy/ShippingPolicy'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const ShippingPolicyPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <ShippingPolicy />
        </Layout>
    )
}

export default ShippingPolicyPage
