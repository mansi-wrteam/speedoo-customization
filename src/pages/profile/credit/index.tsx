import MetaData from '@/components/metadata-component/MetaData'
const CreditPage = dynamic(()=>import('@/components/pagecomponents/CreditPage'),{ssr:false})
import dynamic from 'next/dynamic'
import React from 'react'

const index = () => {
    return (
        <div>
            <MetaData pageName="/profile/credit" title={`Credit - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
            <CreditPage />
        </div>
    )
}

export default index
