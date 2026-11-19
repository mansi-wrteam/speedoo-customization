import React, { useEffect } from 'react'
import Layout from '../layout/Layout'
import PrivacyPolicy from '../privacy-policy/PrivacyPolicy'
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const PrivacyPolicyPage = () => {
  const language = useSelector((state: RootState) => state.Language.selectedLanguage)

  useEffect(() => { }, [language?.id])
  return (
    <Layout>
      <PrivacyPolicy />
    </Layout>
  )
}

export default PrivacyPolicyPage
