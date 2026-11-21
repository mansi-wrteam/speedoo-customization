import MetaData from '@/components/metadata-component/MetaData'
const CouponHistoryPage = dynamic(()=>import('@/components/pagecomponents/CouponHistoryPage'),{ssr:false})
import dynamic from 'next/dynamic'
import React from 'react'

const index = () => {
    return (
        <div>
            <MetaData pageName="/profile/coupon-history" title={`Coupon History - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
            <CouponHistoryPage />
        </div>
    )
}

export default index
