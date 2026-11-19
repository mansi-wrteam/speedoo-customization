import React, { useEffect, useState } from "react";
import { t } from "@/utils/translation";
import NotificationCard from "../notifications/NotificationCard";
import * as api from "../../api/apiRoutes";
import NoNotificationImage from "@/assets/not_found_images/No_Notification.svg"
import Image from "next/image";
import CardSkeleton from "../skeleton/CardSkeleton";
import type { Notification } from "@/types/models";

export interface NotificationsProps {
  /** The list loads when this is "notifications". */
  selectedTab: string;
  /** Passed by ProfileDashboard but not used. */
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
}

const Notifications = ({ selectedTab, setSelectedTab }: NotificationsProps) => {
  const total_notifications_per_page = 7;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currPage, setCurrPage] = useState(1)
  const [offset, setoffset] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [totalNotications, setTotalNotifications] = useState<number | null | undefined>(null)

  useEffect(() => {
    if (selectedTab === "notifications") {
      handleFetchNotifications();
    }
  }, [selectedTab]);

  const handleFetchNotifications = async (offset = 0) => {
    setIsLoading(true);
    try {
      const response = await api.getNotifications({ limit: total_notifications_per_page, offset });
      setTotalNotifications(response.total)
      setNotifications([...notifications, ...response?.data]);
      setIsLoading(false);
    } catch (error) {
      console.log("Error ", error);
    }
  };

  const handleLoadMore = (pageNum: number) => {
    setCurrPage(pageNum);
    setoffset(pageNum * total_notifications_per_page - total_notifications_per_page);
    handleFetchNotifications(pageNum * total_notifications_per_page - total_notifications_per_page);
  };

  return (
    <div>
      <div className="w-full overflow-hidden rounded-2xl outline outline-1 -outline-offset-1 outline-[var(--border-subtle)]">
        <div className="flex justify-between items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
          <h2 className="flex-1 text-xl font-medium leading-7 text-[var(--foreground-primary)]">
            {t("notification")}
          </h2>
        </div>
        {isLoading && Array.from({ length: total_notifications_per_page }).map((_, idx) => (
          <div key={idx} className='w-full'>
            <CardSkeleton height={100} padding='p-1' />
          </div>
        ))}
        {notifications?.length > 0 ?
          notifications?.map((notification, idx) => (
            <NotificationCard
              notification={notification}
              key={notification?.id}
            />
          ))
          : <div className=' col-span-12 h-full w-full flex items-center justify-center flex-col gap-2 p-2'>
            <Image src={NoNotificationImage} alt='Notification Not found' height={448} width={452} className='h-3/4 w-3/4' />
            <h2 className='text-2xl font-bold text-[var(--foreground-primary)]'>{t("empty_notification_list_message")}</h2>
          </div>}

        {notifications?.length < (totalNotications as number) &&
          <div className="flex justify-center p-4">
            <button className='flex items-center rounded-lg px-4 py-2 text-base font-medium leading-6 bg-[var(--button-secondary-background-default)] text-[var(--button-secondary-foreground-default)] transition-colors hover:bg-[var(--button-secondary-background-hover)]'
              onClick={() => handleLoadMore(currPage + 1)}
            >
              {t("load_more")}
            </button>
          </div>
        }
      </div>
    </div>
  );
};

export default Notifications;
