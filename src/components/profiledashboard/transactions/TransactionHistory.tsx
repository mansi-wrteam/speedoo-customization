import { t } from '@/utils/translation'
import React, { useEffect, useState } from 'react'
import TransactionCard from './TransactionCard'
import * as api from "@/api/apiRoutes"
import CardSkeleton from '@/components/skeleton/CardSkeleton'
import NoTransactionImage from "@/assets/not_found_images/No_Transaction.svg"
import Image from 'next/image'
import type { Transaction } from '@/types/models'

const TransactionHistory = () => {

    const [transaction, setTransaction] = useState<Transaction[]>([])
    const [offset, setOffset] = useState(0)
    const [total, setTotal] = useState<number | null | undefined>(null)
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)

    const transactionPerPage = 8;
    useEffect(() => {
        handleFetchTransactions(false, 0);
    }, [])

    const handleFetchTransactions = async (isLoadMore = false, newOffset: number) => {
        if (isLoadMore) {
            setLoadingMore(true)
        } else {
            setLoading(true)
        }
        try {
            const response = await api.getUserTransactions({ limit: transactionPerPage, offset: newOffset, type: "transactions" })
            if (response.status == 1) {
                setTransaction((trnscn) => [...trnscn, ...response.data])
                setTotal(response.total)
                setLoading(false)
                setLoadingMore(false)
            } else {
                setLoading(false)
                setLoadingMore(false)
            }
        } catch (error) {
            setLoading(false)
            setLoadingMore(false)
            console.log("Error", error)
        }
    }

    const handleFetchMore = () => {
        const newOffset = offset + transactionPerPage
        setOffset(newOffset)
        handleFetchTransactions(true, newOffset)
    }

    return (
        <div>
            <div className='w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]'>
                <div className='flex justify-between items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4'>
                    <h2 className='flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]'>{t("transaction_history")}</h2>
                </div>
                <div>
                    <div className='grid grid-cols-12'>
                        {loading ?
                            Array?.from({ length: 6 })?.map((_, index) => {
                                return (
                                    <div className='col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-6 xl:col-span-6 p-4 md:p-2 lg:p-4' key={index}>
                                        <CardSkeleton height={200} />
                                    </div>
                                )
                            })
                            : transaction?.length > 0 ?
                                transaction?.map((transaction) => {
                                    return (
                                        <TransactionCard transaction={transaction} key={transaction?.id} />
                                    )
                                }) : <div className=' col-span-12 h-full w-full flex items-center justify-center flex-col gap-2 p-2'>
                                    <Image src={NoTransactionImage} alt='Transactions Not found' unoptimized className='h-3/4 w-3/4' />
                                    <h2 className='text-2xl font-bold text-[var(--foreground-primary)]'>{t("no_transaction")}</h2>
                                </div>
                        }
                        {loadingMore ?
                            Array?.from({ length: 6 })?.map((_, index) => {
                                return (
                                    <div className='col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-6 xl:col-span-6 p-4 md:p-2 lg:p-4' key={index}>
                                        <CardSkeleton height={200} />
                                    </div>
                                )
                            }) : <></>}

                    </div>
                </div>

                {(total as number) > transaction?.length && <div className='flex justify-center p-4'>
                    <button className='rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]' onClick={handleFetchMore}>{t("load_more")}</button>
                </div>}
            </div>
        </div>
    )
}

export default TransactionHistory