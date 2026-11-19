import React from 'react'
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import AnimationOne from "@/assets/order_place_animation/order_failed_animation.json"
import { useRouter } from 'next/router';
import { t } from '@/utils/translation';
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export interface OrderFailedModalProps {
    showOrderFailed: boolean;
    handleFailedOrder: React.MouseEventHandler<HTMLButtonElement>;
}

const OrderFailedModal = ({ showOrderFailed, handleFailedOrder }: OrderFailedModalProps) => {

    const router = useRouter();


    return (
        <Dialog open={showOrderFailed}>
            <DialogContent>
                <DialogHeader>
                    <div className="flex flex-col relative gap-8">
                        {/* Lottie animations */}

                        <Lottie
                            className="h-44"
                            animationData={AnimationOne}
                            loop={false}
                        />

                        <div className="text-center mt-8">
                            <h1 className="text-2xl">{t("order_failed_description")}</h1>
                            <button
                                className="mt-8 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                                onClick={handleFailedOrder}
                            >
                                {t("home")}
                            </button>
                        </div>
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}

export default OrderFailedModal