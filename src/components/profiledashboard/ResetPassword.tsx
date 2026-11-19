import { t } from '@/utils/translation'
import React, { useState, useEffect } from 'react'
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa'
import * as api from "@/api/apiRoutes"
import { toast } from 'react-toastify'
import { isRtl } from '@/lib/utils'


const ResetPassword = () => {

    const rtl = isRtl();
    const [showPassword, setShowPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [password, setPassword] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState<string | null>(null);
    const [confirmPassword, setConfirmPassword] = useState<string | null>(null);

    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            if (!newPassword) {
                toast.error(t("please_enter_new_password"))
                return
            }
            else if (newPassword?.length < 6) {
                toast.error(t("password_length_msg"))
                return
            }
            else if (newPassword !== confirmPassword) {
                toast.error(t("confirm_password_message"))
                return
            }
            const res = await api.resetPassword({ password: password as string, newPassword: newPassword, confirmPassword: confirmPassword })
            if (res.status == 1) {
                toast.success(res.message)
                setPassword("")
                setConfirmPassword("")
                setNewPassword("")
            } else {
                toast.error(res.message)
            }

        } catch (error) {
            console.log("error", error)
        }
    }

    return (
        <div className="w-full mx-auto h-fit overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
            <div className='w-full border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]'>
                <h2 className="p-4 text-xl font-medium leading-7 text-[var(--foreground-primary)]">{t("resetPassword")}</h2>
            </div>
            <div className='  items-center flex  flex-col py-12'>
                <form className='w-[90%] md:w-1/2' onSubmit={handleResetPassword}>
                    <div>
                        <div className="mb-4 relative">
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium "
                            >
                                {t("password")} <span className="text-[var(--status-error-default)]">*</span>
                            </label>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="name"
                                name="name"
                                placeholder={t("please_enter_password")}
                                className="mt-1 block w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)] px-4 py-2 disabled:text-[var(--foreground-disabled)]"
                                required
                                value={password as string}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <div
                                className={`absolute ${rtl ? "left-[12px]" : "right-[12px]"} top-[36px]`}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                            </div>
                        </div>
                        <div className="mb-4 relative">
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium "
                            >
                                {t("newPassword")} <span className="text-[var(--status-error-default)]">*</span>
                            </label>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                id="name"
                                name="name"
                                placeholder={t("please_enter_new_password")}
                                className="mt-1 block w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)] px-4 py-2 disabled:text-[var(--foreground-disabled)]"
                                required
                                value={newPassword as string}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <div
                                className={`absolute ${rtl ? "left-[12px]" : "right-[12px]"} top-[36px]`}
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                            </div>
                        </div>
                        <div className="mb-4 relative">
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium "
                            >
                                {t("confirmPassword")} <span className="text-[var(--status-error-default)]">*</span>
                            </label>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="name"
                                name="name"
                                placeholder={t("please_enter_confirm_password")}
                                className="mt-1 block w-full rounded-lg bg-[var(--form-default-background)] p-2 text-base leading-6 text-[var(--form-default-text)] placeholder:text-[var(--form-default-placeholder)] outline outline-1 -outline-offset-1 outline-[var(--form-default-border)] focus:outline-[var(--form-focus-filled-border)] px-4 py-2 disabled:text-[var(--foreground-disabled)]"
                                required
                                value={confirmPassword as string}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <div
                                className={`absolute ${rtl ? "left-[12px]" : "right-[12px]"} top-[36px]`}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end w-full">
                            <button
                                type="submit"
                                className="w-44 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]"
                            // disabled={isChanged == false}

                            >
                                {t("change_password")}
                            </button>
                        </div>
                    </div>
                </form>

            </div>

        </div>
    )
}

export default ResetPassword;