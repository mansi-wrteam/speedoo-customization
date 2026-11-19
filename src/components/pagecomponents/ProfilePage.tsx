import React, { useEffect } from 'react'
import ProfileDashboard from '../profiledashboard/ProfileDashboard'
import Layout from '../layout/Layout'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const ProfilePage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <ProfileDashboard />
        </Layout>
    )
}

export default ProfilePage