import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import OrderDetail from '../orderdetail/OrderDetail'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const OrderDetailPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <OrderDetail />
        </Layout>
    )
}

export default OrderDetailPage