import Layout from '../layout/Layout'
import React, { useEffect } from 'react'
import ProfileDashboard from '../profiledashboard/ProfileDashboard'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'


const ActiceOrdersPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout><ProfileDashboard /></Layout>
    )
}

export default ActiceOrdersPage