import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogOverlay
} from "@/components/ui/dialog"
import { t } from "@/utils/translation"
import { useSelector } from 'react-redux'
import * as api from "@/api/apiRoutes"
import { clearAllFilter } from "@/redux/slices/productFilterSlice";
import { logoutAuth, setJWTToken, setCurrentUser, setAuthType, } from "@/redux/slices/userSlice"
import { clearCartPromo, setCart, setCartProducts, setCartSubTotal, setIsGuest } from "@/redux/slices/cartSlice"
import { useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import type { AppDispatch } from '@/redux/hooks'
import type { RootState } from '@/types/state'

export interface LogoutModalProps {
    showLogout: boolean;
    setShowLogout: React.Dispatch<React.SetStateAction<boolean>>;
}

const LogoutModal = ({ showLogout, setShowLogout }: LogoutModalProps) => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const theme = useSelector((state: RootState) => state.Theme.theme)

    const handleHideLogout = () => {
        setShowLogout(false)
    }

    const handleLogout = async () => {
        try {
            const response = await api.logout();
            if (response.status == 1) {
                dispatch(clearAllFilter())
                dispatch(logoutAuth())
                dispatch(setJWTToken({ data: "" }))
                dispatch(setCurrentUser({ data: null }))
                dispatch(setCart({ data: [] }))
                dispatch(setCartProducts({ data: [] }))
                dispatch(setCartSubTotal({ data: 0 }))
                dispatch(setCartProducts({ data: [] }))
                dispatch(clearCartPromo())
                dispatch(setIsGuest({ data: true }))
                router.push("/")
                setShowLogout(false)
                toast.success(response.message)
            } else {
                toast.error(response.message)

            }
        } catch (error) {
            console.log("Error", error)
        }
    }

    return (
        <Dialog open={showLogout} >
            <DialogOverlay className={`${theme == "light" ? "bg-white/80" : "bg-black/80"}`} />
            <DialogContent>
                <div>
                    <h1 className='font-bold'>{t("logout_title")}</h1>
                    <h1 className='font-bold'>{t("logout_message")}</h1>
                    <div className='flex gap-2 mt-3'>
                        <button className='rounded-lg px-4 py-2 text-base font-medium leading-6 outline outline-1 -outline-offset-1 outline-[var(--button-outline-border-default)] text-[var(--button-outline-foreground-default)] transition-colors hover:bg-[var(--button-outline-background-hover)] hover:text-[var(--button-outline-foreground-hover)]' onClick={handleHideLogout}> {t("cancel")}</button>
                        <button className='rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-primary-background-default)] text-[var(--button-primary-foreground-default)] transition-colors hover:bg-[var(--button-primary-background-hover)]' onClick={handleLogout}>{t("Ok")}</button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default LogoutModal