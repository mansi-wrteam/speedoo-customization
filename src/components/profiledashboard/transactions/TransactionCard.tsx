import React from 'react'
import Image from 'next/image'
import { t } from "@/utils/translation"

import CashfreeImage from "@/assets/payment_methods_svgs/ic_cashfree.svg";
import RazorpayImage from "@/assets/payment_methods_svgs/ic_razorpay.svg";
import PaypalImage from "@/assets/payment_methods_svgs/ic_paypal.svg";
import PaystackImage from "@/assets/payment_methods_svgs/ic_paystack.svg";
import StriperImage from "@/assets/payment_methods_svgs/ic_stripe.svg";
import MidtransImage from "@/assets/payment_methods_svgs/Midtrans.svg";
import PhonePeImage from "@/assets/payment_methods_svgs/Phonepe.svg";
import PaytabsImage from "@/assets/payment_methods_svgs/ic_paytabs.svg";
import DpoImage from "@/assets/payment_methods_svgs/ic_dpo_full.svg";
import { useSelector } from 'react-redux'
import { CiWallet } from "react-icons/ci";
import { RiBankCardLine } from "react-icons/ri";
import type { StaticImageData } from "next/image";
import type { RootState } from "@/types/state";
import type { Transaction } from "@/types/models";

export interface TransactionCardProps {
    transaction: Transaction;
}

// Keyed lowercase and matched case-insensitively below — the API doesn't send
// these consistently (`Phonepe` vs the display name `PhonePe`, `PayTabs` vs
// `Paytabs`), so a case-sensitive lookup silently missed every one of them
// and rendered a broken <Image src={undefined}>.
const paymentMethodsConfig: Record<string, StaticImageData | undefined> = {
    razorpay: RazorpayImage,
    paypal: PaypalImage,
    paystack: PaystackImage,
    stripe: StriperImage,
    cashfree: CashfreeImage,
    midtrans: MidtransImage,
    phonepe: PhonePeImage,
    paytabs: PaytabsImage,
    dpo: DpoImage,
};

const TransactionCard = ({ transaction }: TransactionCardProps) => {

    const setting = useSelector((state: RootState) => state.Setting.setting)

    const normalizedType = transaction?.type?.toLowerCase();
    // Wallet credits/debits aren't a gateway — there's no ic_wallet.svg, so it
    // gets an icon-font glyph instead of an entry in the image map.
    const isWallet = normalizedType === "wallet";
    const paymentIcon = paymentMethodsConfig[normalizedType as string];

    const isSuccess = transaction?.status == "success";

    return (
        <div className='col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-6 xl:col-span-6 p-4 md:p-2 lg:p-4'>
            <div className="h-full overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                {/* Header: Transaction ID and Date */}
                <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] p-4">
                    <div className="flex flex-col justify-center gap-1">
                        <p className="text-nowrap text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">{t("transaction")}</p>
                        <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{transaction?.id}</p>
                    </div>
                    <div className="flex flex-1 flex-col items-end justify-center gap-1 text-right">
                        <p className="break-words text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">{t("date")}</p>
                        <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{transaction?.created_at}</p>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center gap-4 p-4">
                    <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg p-2 outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]'>
                        {isWallet ? (
                            <CiWallet size={28} className="text-[var(--brand-foreground-default)]" />
                        ) : paymentIcon ? (
                            <Image
                                src={paymentIcon}
                                alt={transaction?.type as string}
                                className="h-full w-full object-contain"
                                height={48}
                                width={48}
                                unoptimized
                            />
                        ) : (
                            <RiBankCardLine size={28} className="text-[var(--foreground-tertiary)]" />
                        )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">{t("payment_method")}</p>
                        <p className="text-base font-semibold leading-6 text-[var(--foreground-primary)]">{transaction?.type}</p>
                    </div>
                </div>

                {/* Transaction Amount Section */}
                <div className="flex items-center justify-between gap-2 bg-[var(--surface-subtle)] p-4">
                    <div className="flex flex-1 flex-col justify-center gap-1">
                        <p className="line-clamp-1 text-sm font-normal leading-5 text-[var(--foreground-tertiary)]">{t("transaction")} {t("amount")}</p>
                        <p className="line-clamp-1 text-xl font-semibold leading-7 text-[var(--foreground-primary)]">{setting?.currency}{transaction?.amount?.toFixed(setting?.decimal_point ? setting?.decimal_point as number : 0)}</p>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-1">
                        <span
                            className={`inline-flex items-center justify-center rounded-lg p-2 text-center text-sm font-semibold leading-5 outline outline-1 -outline-offset-1 ${
                                isSuccess
                                    ? "bg-[var(--status-success-background)] text-[var(--status-success-foreground)] outline-[var(--status-success-border)]"
                                    : "bg-[var(--status-error-background)] text-[var(--status-error-foreground)] outline-[var(--status-error-border)]"
                            }`}
                        >
                            {isSuccess ? t("success") : t("failed")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TransactionCard
