import React, { useEffect, useState } from 'react'
import { t } from "@/utils/translation";
import * as api from "@/api/apiRoutes"
import { Switch } from "@/components/ui/switch"
import Loader from '@/components/loader/Loader';
import { toast } from 'react-toastify';
import type { Id } from '@/types/common';
import type { MailSettings } from '@/types/models';

const NotificationSetting = () => {
    const [mailSettings, setMailSettings] = useState<MailSettings[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        handleGetApiSetting();
    }, []);

    const handleGetApiSetting = async () => {
        setLoading(true);
        try {
            const res = await api.getMailSettings();
            setMailSettings(res.data);
            setLoading(false);
        } catch (error) {
            setLoading(false);
            console.log("error", error)
        }
    }

    const handleToggle = (id: Id, type: "mail_status" | "mobile_status", checked: boolean) => {
        const updatedSettings = mailSettings.map((item) => {
            if (item.id === id) {
                return { ...item, [type]: checked ? 1 : 0 };
            }
            return item;
        });
        setMailSettings(updatedSettings);
    }

    const handleUpdateSettings = async () => {
        setSubmitting(true);
        const status_ids = mailSettings.map((item, index) => index + 1).join(",");
        const mail_statuses = mailSettings.map((item) => item.mail_status).join(",");
        const mobile_statuses = mailSettings.map((item) => item.mobile_status).join(",");
        const sms_status = mailSettings.map((item) => item.sms_status || 0).join(",");

        try {
            const res = await api.updateMailSettings({
                status_ids,
                mail_statuses,
                mobile_statuses,
                sms_status,
            });
            toast.success(t("notification_setting_success"));
            setSubmitting(false);
        } catch (error) {
            console.log("error", error)
            setSubmitting(false);
        }
    }

    return (
        loading ? <Loader /> : (
            <div>
                <div className="w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                        <h2 className="font-bold text-xl">{t("notification_setting")}</h2>
                    </div>
                </div>
                <div>
                    <div className='flex items-center justify-end gap-4 my-2'>
                        <div>{t("email")}</div>
                        <div>{t("mobileText")}</div>
                    </div>
                    {mailSettings?.map((item, index) => (
                        <div key={item?.id} className='flex items-center justify-between py-2 border p-4 rounded-md my-2'>
                            <h2 className='text-base font-medium leading-6 text-[var(--foreground-primary)]'>{item?.status_name?.substring(0, 16)}</h2>
                            <div className='flex gap-4'>
                                <Switch checked={Boolean(item.mail_status)} onCheckedChange={(checked) => handleToggle(item.id, 'mail_status', checked)} />
                                <Switch checked={Boolean(item.mobile_status)} onCheckedChange={(checked) => handleToggle(item.id, 'mobile_status', checked)} />
                            </div>
                        </div>
                    ))}
                    <div className="mt-6 flex justify-end w-full">
                        <button
                            type="submit"
                            className="w-28 rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]"
                            disabled={submitting}
                            onClick={handleUpdateSettings}
                        >
                            {submitting ? t("saving") : t("save")}
                        </button>
                    </div>
                </div>
            </div>
        )
    )
}

export default NotificationSetting