import React, { useEffect, useState } from 'react'
import { t } from "@/utils/translation"
import WalletTransactionCard from './WalletTransactionCard'
import * as api from "@/api/apiRoutes"
import CardSkeleton from '@/components/skeleton/CardSkeleton'
import NoTransactionFound from "@/assets/not_found_images/No_Transaction.svg"
import Image from 'next/image'
import type { WalletTransaction } from '@/types/models'


const WalletHistory = () => {

    const [transactions, setTransactions] = useState<WalletTransaction[]>([])
    const [offset, setOffset] = useState(0)
    const [total, setTotal] = useState<number | null | undefined>(null)
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    useEffect(() => {
        fetchWalletTransaction(false, 0);
    }, [])

    const transactionPerPage = 8;

    const fetchWalletTransaction = async (isLoadMore = false, newOffset: number) => {
        if (isLoadMore) {
            setLoadingMore(true)
        } else {
            setLoading(true)
        }
        try {
            const response = await api.getUserTransactions({ limit: transactionPerPage, offset: newOffset, type: 'wallet' })
            if (response.status == 1) {
                setTransactions((trnscn) => [...trnscn, ...response.data])
                setTotal(response?.total)
                setLoading(false)
                setLoadingMore(false)
            } else {
                setTransactions([])
                setTotal(0)
                setLoading(false)
                setLoadingMore(false)
            }

        } catch (error) {
            setLoading(false)
            setLoadingMore(false)
            console.log("Error", error)
        }
    }

    const handleFetchMore = async () => {
        const newOffset = offset + transactionPerPage
        setOffset(newOffset)
        fetchWalletTransaction(true, newOffset)
    }

    return (
        <div>
            <div className='w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]'>
                <div className='flex justify-between items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4'>
                    <h2 className='flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]'>{t("wallet_history")}</h2>
                </div>
                <div>
                    <div className='grid grid-cols-12 '>
                        {loading ? Array?.from({ length: 6 })?.map((_, index) => {
                            return (
                                <div className='col-span-12  md:col-span-12 xl:col-span-6 p-4 md:p-2 lg:p-4' key={index}>
                                    <CardSkeleton height={200} />
                                </div>
                            )
                        }) : transactions?.length > 0 ? transactions?.map((transaction) => {
                            return (
                                <div className='col-span-12  md:col-span-12 xl:col-span-6 p-4 md:p-2 lg:p-4' key={transaction?.id}>
                                    <WalletTransactionCard transaction={transaction} />
                                </div>
                            )
                        }) : <div className=' col-span-12 h-full w-full flex items-center justify-center flex-col gap-2 p-2'>
                            <Image src={NoTransactionFound} alt='Transactions Not found' height={320} width={320} unoptimized className='h-3/4 w-3/4' />
                            <h2 className='text-2xl font-bold text-[var(--foreground-primary)]'>{t("no_transaction")}</h2>
                        </div>}
                        {loadingMore ?
                            Array?.from({ length: 6 })?.map((_, index) => {
                                return (
                                    <div className='col-span-12  md:col-span-12 xl:col-span-6 p-4 md:p-2 lg:p-4' key={index}>
                                        <CardSkeleton height={200} />
                                    </div>
                                )
                            }) : <></>}

                    </div>
                    {(total as number) > transactions?.length && <div className='flex justify-center p-4'>
                        <button className='rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]' onClick={handleFetchMore}>{t("load_more")}</button>
                    </div>}

                </div>
            </div>
        </div>
    )
}

export default WalletHistory