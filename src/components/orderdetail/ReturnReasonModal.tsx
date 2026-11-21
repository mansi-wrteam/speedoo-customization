import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { t } from '@/utils/translation';
import { toast } from 'react-toastify';
import * as api from "@/api/apiRoutes"
import type { OrderItem } from '@/types/models';
import CreditCancelNote from './CreditCancelNote';
import { useRefreshUser } from '@/utils/useRefreshUser';

export interface ReturnReasonModalProps {
    showReturnModal: boolean;
    setShowReturnModal: React.Dispatch<React.SetStateAction<boolean>>;
    /** Order line being returned. */
    selectedProduct: OrderItem;
    handleFetchOrderDetail: () => Promise<void>;
    /** The order was paid on credit: explain the schedule change and refresh the wallet. */
    isCreditOrder?: boolean;
}

const ReturnReasonModal = ({ showReturnModal, setShowReturnModal, selectedProduct, handleFetchOrderDetail, isCreditOrder }: ReturnReasonModalProps) => {
    const refreshUser = useRefreshUser();


    const [returnReason, setReturnReason] = useState("")
    // Starts as "" and is then set to booleans; never read.
    const [loading, setLoading] = useState<string | boolean>("")

    const handleHideReturnModal = () => {
        setShowReturnModal(false)
        setReturnReason("")
    }

    const handleProductReturn = async () => {
        if (!returnReason) {
            toast.error(t("reason_is_required"))
            return
        }
        setLoading(true)
        try {
            const response = await api.changeOrderStatus({ orderId: selectedProduct?.order_id, orderItemId: selectedProduct?.id, status: 8, reason: returnReason })
            if (response?.status == 1) {
                setReturnReason("");
                setLoading(false);
                toast.success(response.message);
                await handleFetchOrderDetail()
                if (isCreditOrder) await refreshUser()
                setShowReturnModal(false)
            } else {
                toast.error(response.message)
                setLoading(false);
            }
        } catch (error) {
            console.log("Error", error)
        }

    }



    return (
        <Dialog open={showReturnModal}>
            <DialogContent>
                <DialogHeader className="font-bold text-2xl text-start flex flex-row justify-between">
                    {t("return_reason")}
                    <div className="cursor-pointer rounded-full bg-[var(--surface-subtle)] p-2 text-[var(--foreground-primary)] transition-colors hover:bg-[var(--surface-hover)]">
                        <RiCloseFill size={22} onClick={handleHideReturnModal} />
                    </div>
                </DialogHeader>
                <div className='flex flex-col gap-2'>
                    {isCreditOrder && <CreditCancelNote />}
                    <div className='flex flex-col gap-1'>
                        <label className='text-base font-medium leading-6 text-[var(--foreground-primary)]'>{t("reason")}<span className='text-[var(--status-error-default)]'>*</span></label>
                        <textarea name="" id="" className='w-full rounded-lg bg-[var(--form-default-background)] p-2 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)]' placeholder={t("write_return_reason")} onChange={(e) => setReturnReason(e.target.value)} value={returnReason}></textarea>
                    </div>
                    <div className='flex justify-end'>
                        <button onClick={handleProductReturn} className='rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]'>{t("submit")}</button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default ReturnReasonModal