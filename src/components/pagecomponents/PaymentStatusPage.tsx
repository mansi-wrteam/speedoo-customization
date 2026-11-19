import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import PaymentStatus from '../payment-status/PaymentStatus'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const PaymentStatusPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <PaymentStatus />
        </Layout>
    )
}

export default PaymentStatusPage