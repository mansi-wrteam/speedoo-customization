import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { t } from '@/utils/translation';
import * as api from "@/api/apiRoutes"
import { toast } from 'react-toastify';
import type { OrderItem } from '@/types/models';

export interface CancelReasonModalProps {
    showCancelMoodal: boolean;
    setShowCancelModal: React.Dispatch<React.SetStateAction<boolean>>;
    /** Order line being cancelled. */
    selectedProduct: OrderItem;
    handleFetchOrderDetail: () => Promise<void>;
}

const CancelReasonModal = ({ showCancelMoodal, setShowCancelModal, selectedProduct, handleFetchOrderDetail }: CancelReasonModalProps) => {

    const [loading, setLoading] = useState(false);
    const [cancelReason, setCancelReason] = useState("")

    const handleHideCancelModal = () => {
        setCancelReason("");
        setShowCancelModal(false)
    }

    const handleCancelOrder = async () => {
        if (!cancelReason) {
            toast.error(t("reason_is_required"))
            return
        }
        setLoading(true)
        try {
            const response = await api.changeOrderStatus({ orderId: selectedProduct?.order_id, orderItemId: selectedProduct?.id, status: 7, reason: cancelReason })
            if (response?.status == 1) {
                setCancelReason("");
                setLoading(false);
                toast.success(response.message);
                await handleFetchOrderDetail()
                setShowCancelModal(false)
            } else {
                toast.error(response.message)
                setLoading(false);
            }
        } catch (error) {
            console.log("Error", error)
            setLoading(false)
        }
    }

    return (
        <Dialog open={showCancelMoodal}>
            <DialogContent className="max-w-[752px] w-full p-0 gap-0 rounded-2xl overflow-hidden bg-[var(--surface-default)]">
                <DialogHeader className="p-4 border-b border-[var(--border-subtle)] flex flex-row justify-between items-center space-y-0">
                    <span className="text-xl font-semibold text-[var(--foreground-primary)]">
                        {t("cancel")}
                    </span>
                    <div className="rounded-lg p-3 gap-1 cursor-pointer">
                        <RiCloseFill
                            size={22}
                            className="text-[var(--button-link-foreground-default)]"
                            onClick={handleHideCancelModal}
                        />
                    </div>
                </DialogHeader>
                <div className="p-4 flex flex-col items-end gap-4">
                    <div className="self-stretch flex flex-col gap-1">
                        <label className="text-sm font-normal text-[var(--form-default-label)]">
                            {t("reason")}
                        </label>
                        <textarea
                            className="w-full h-32 px-2 py-1 bg-[var(--form-default-background)] border border-[var(--form-default-border)] rounded-lg outline-none text-base text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] resize-none"
                            placeholder={t("write_cancel_reason")}
                            onChange={(e) => setCancelReason(e.target.value)}
                            value={cancelReason}
                        ></textarea>
                    </div>
                    <button
                        onClick={handleCancelOrder}
                        className="px-4 py-2 bg-[var(--button-primary-background-default)] hover:bg-[var(--button-primary-background-hover)] text-[var(--button-primary-foreground-default)] rounded-lg font-medium text-base transition-colors"
                    >
                        {loading ? t("loading") : t("submit")}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default CancelReasonModal