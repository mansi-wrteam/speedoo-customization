import React from 'react'
import BreadCrumb from '../breadcrumb/BreadCrumb'
import { useSelector } from 'react-redux'
import { isEmptyHtml } from '@/lib/utils'
import { t } from '@/utils/translation'
import NoInfoData from '../common/NoInfoData'
import type { RootState } from '@/types/state'

const ReturnAndExchangePolicy = () => {
    const setting = useSelector((state: RootState) => state?.Setting?.setting);
    return (
        <section>
            <div>
                <BreadCrumb />
            </div>
            {isEmptyHtml(setting?.returns_and_exchanges_policy) ? (
                <NoInfoData title={t('return_and_exchange_policy')} />
            ) : (
                <div className='container my-5 px-1 md:px-0 '>
                    <div
                        className='flex flex-col gap-4 rounded p-4 items-start [&_ul]:list-disc [&_ul]:pl-5 bg-[var(--surface-subtle)] outline outline-1 -outline-offset-1 outline-[var(--border-subtle)] infoContent [&_a]:text-[revert] [&_a]:underline md:p-7'
                        dangerouslySetInnerHTML={{
                            __html: setting?.returns_and_exchanges_policy as string,
                        }}
                    />
                </div>
            )}
        </section>
    )
}

export default ReturnAndExchangePolicy
