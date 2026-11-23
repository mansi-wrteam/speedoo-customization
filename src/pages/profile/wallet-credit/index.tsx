import MetaData from '@/components/metadata-component/MetaData'
import { walletCreditTitle } from '@/utils/credit'
const WalletCreditPage = dynamic(()=>import('@/components/pagecomponents/WalletCreditPage'),{ssr:false})
import dynamic from 'next/dynamic'
import React from 'react'

const index = () => {
    return (
        <div>
            <MetaData pageName="/profile/wallet-credit" title={`${walletCreditTitle()} - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
            <WalletCreditPage />
        </div>
    )
}

export default index
