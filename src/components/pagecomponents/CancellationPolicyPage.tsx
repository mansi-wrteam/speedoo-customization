import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import CancellationPolicy from '../cancellation-policy/CancellationPolicy'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const CancellationPolicyPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <CancellationPolicy />
        </Layout>
    )
}

export default CancellationPolicyPage
