import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import ContactUs from '../contact-us/ContactUs'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const ContactUsPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <ContactUs />
        </Layout>
    )
}

export default ContactUsPage
