import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { t } from "@/utils/translation";
import OrderPlacedIcon from "@/components/common/OrderPlacedIcon";


export interface OrderSuccessModalProps {
    showOrderSuccess: boolean;
    handlePaymentClose: React.MouseEventHandler<HTMLButtonElement>;
}

const OrderSuccessModal = ({ showOrderSuccess, handlePaymentClose }: OrderSuccessModalProps) => {
    return (
        <Dialog open={showOrderSuccess}>
            <DialogContent>
                <DialogHeader>
                    <div className="flex flex-col relative gap-8 items-center">
                        <OrderPlacedIcon />
                        <div className="text-center mt-8">
                            <h1 className="text-2xl">{t("order_placed_description")}</h1>
                            <button
                                className="mt-8 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                                onClick={handlePaymentClose}
                            >
                                {t("home")}
                            </button>
                        </div>
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
};

export default OrderSuccessModal;
