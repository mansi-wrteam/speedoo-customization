import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import ProfileDashboard from '../profiledashboard/ProfileDashboard'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'
import CheckResetPassword from '@/HOC/CheckResetPassword'

const ResetPasswordPage = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => { }, [language?.id])
    return (
        <Layout>
            <ProfileDashboard />
        </Layout>
    )
}

export default CheckResetPassword(ResetPasswordPage);