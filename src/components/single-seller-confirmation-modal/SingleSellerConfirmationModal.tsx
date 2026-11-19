import React from 'react'
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { useSelector, useDispatch } from 'react-redux';
import { t } from '@/utils/translation';
import * as api from "@/api/apiRoutes"
import { setCart, setCartProducts, setCartSubTotal } from '@/redux/slices/cartSlice';
import { toast } from 'react-toastify';
import type { AppDispatch } from '@/redux/hooks';
import type { RootState } from '@/types/state';
import type { CartLine, Product, ProductVariant } from '@/types/models';

export interface SingleSellerConfirmationModalProps {
    showSingleSellerModal: boolean;
    setSingleSellerModal: React.Dispatch<React.SetStateAction<boolean>>;
    /** Only `id` is read. */
    product: Pick<Product, "id"> | null | undefined;
    /** Only `id` is read. */
    selectedVariant: Pick<ProductVariant, "id"> | null | undefined;
}

const SingleSellerConfirmationModal = ({ showSingleSellerModal, setSingleSellerModal, product, selectedVariant }: SingleSellerConfirmationModalProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const theme = useSelector((state: RootState) => state.Theme.theme)
    const cart = useSelector((state: RootState) => state.Cart)

    const handleHideSingleSeller = () => {
        setSingleSellerModal(false)
    }



    const handleAddToCart = async () => {
        try {
            // await handleDeleteCart()

            const res = await api.deleteCart();
            if (res.status == 1) {
                dispatch(setCart({ data: [] }));
                dispatch(setCartSubTotal({ data: 0 }));
                dispatch(setCartProducts({ data: [] }));
                const response = await api.addToCart({ product_id: product?.id, product_variant_id: selectedVariant?.id, qty: 1 })
                if (response.status === 1) {
                    if (cart?.cartProducts?.find((prdct) => ((prdct?.product_id == product?.id) && (prdct?.product_variant_id == selectedVariant?.id)))?.qty == undefined) {
                        dispatch(setCart({ data: response }));
                        const cartProduct = {
                            product_id: product?.id,
                            product_variant_id: selectedVariant?.id,
                            qty: 1
                        } as CartLine
                        dispatch(setCartProducts({
                            data: [cartProduct]
                        }));
                        dispatch(setCartSubTotal({ data: response?.sub_total }));
                    }
                    setSingleSellerModal(false)

                } else {
                    toast.error(response?.message);
                    setSingleSellerModal(false)
                }
            }

        } catch (error) {
            console.log("Error", error)
        }
    }


    return (
        <Dialog open={showSingleSellerModal}>
            <DialogOverlay
                className={`${theme == "light" ? "bg-white/80" : "bg-black/80"}`}
            />
            <DialogContent>
                <div className=''>
                    <div className='flex flex-col gap-2 font-bold'><span>{t("single_seller_warning")}</span><span>{t("clear_cart_warning")}</span></div>
                    <div className='flex gap-2 mt-2'>


                        <button
                            className="rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]"
                            onClick={handleHideSingleSeller}
                        >
                            {" "}
                            {t("cancel")}
                        </button>
                        <button
                            className="rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]"
                            onClick={handleAddToCart}
                        >
                            {t("Ok")}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SingleSellerConfirmationModal