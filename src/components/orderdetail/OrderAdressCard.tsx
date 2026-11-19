import { t } from '@/utils/translation'
import React from 'react'
import type { Order } from '@/types/models'

export interface OrderAdressCardProps {
    orderDetail: Order;
}

const OrderAdressCard = ({ orderDetail }: OrderAdressCardProps) => {
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className='flex justify-between items-center gap-2.5'>
                <h2 className="flex-1 text-base font-semibold leading-6 text-[var(--foreground-primary)]">{t("deliver_to")}: {orderDetail?.user_name}</h2>
            </div>
            <p className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">
                {orderDetail?.order_address}
            </p>
            <p className="text-sm font-medium leading-5 text-[var(--foreground-secondary)]">{t("phone")} : {orderDetail?.order_mobile}</p>
        </div>
    )
}

export default OrderAdressCard