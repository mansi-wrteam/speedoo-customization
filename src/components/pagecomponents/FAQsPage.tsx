import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import FAQs from '../faqs/FAQs'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const FAQsPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <FAQs />
        </Layout>
    )
}

export default FAQsPage
