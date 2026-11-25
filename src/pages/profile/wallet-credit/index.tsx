import MetaData from '@/components/metadata-component/MetaData'
import { t } from '@/utils/translation'
const WalletCreditPage = dynamic(()=>import('@/components/pagecomponents/WalletCreditPage'),{ssr:false})
import dynamic from 'next/dynamic'
import React from 'react'

const index = () => {
    return (
        <div>
            <MetaData pageName="/profile/wallet-credit" title={`${t("wallet_and_credit")} - ${process.env.NEXT_PUBLIC_META_TITLE}`} />
            <WalletCreditPage />
        </div>
    )
}

export default index
