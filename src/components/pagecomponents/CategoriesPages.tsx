import React, { useEffect } from 'react'
import Category from '../categories/Category'
import Layout from "../layout/Layout"
import { useSelector } from 'react-redux'
import type { RootState } from '@/types/state'

const CategoriesPages = () => {
    const language = useSelector((state: RootState) => state.Language.selectedLanguage)

    useEffect(() => {
        
    }, [language?.id])
    return (
        <Layout>
            <Category />
        </Layout>
    )
}

export default CategoriesPages