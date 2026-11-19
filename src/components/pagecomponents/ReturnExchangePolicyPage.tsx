import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import ReturnAndExchangePolicy from '../return-and-exchange-policy/ReturnAndExchangePolicy'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const ReturnExchangePolicyPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <ReturnAndExchangePolicy />
        </Layout>
    )
}

export default ReturnExchangePolicyPage
