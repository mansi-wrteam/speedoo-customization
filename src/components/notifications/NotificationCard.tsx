import { formatCustomDate } from "@/lib/utils";
import { setFilterCategory } from "@/redux/slices/productFilterSlice";
import Image from "next/image";
import { useLocalizedRouter } from "@/utils/localizedNav";
import React, { useState } from "react";
import { FaRegBell } from "react-icons/fa";
import { IoTimeOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import * as api from "@/api/apiRoutes";
import { t } from "@/utils/translation";
import type { AppDispatch } from "@/redux/hooks";
import type { Notification } from "@/types/models";
import type { RootState } from "@/types/state";

export interface NotificationCardProps {
  notification: Notification;
}

const NotificationCard = ({ notification }: NotificationCardProps) => {
  const router = useLocalizedRouter();
  const dispatch = useDispatch<AppDispatch>();

  const city = useSelector((state: RootState) => state.City.city);
  const [imageFailed, setImageFailed] = useState(false);

  const handleCategoryNotificationClick = async (notification: Notification) => {
    if (notification?.type === "category") {
      // type_id is the category for a "category" notification; same "id," form
      // the category filter reads (CategoryTree splits on ",").
      dispatch(setFilterCategory({ data: `${notification?.type_id},` }));
      router.push("/products");
    } else if (notification?.type === "product") {
      // The product page opens by slug, but the notification only has the
      // product id: look the product up by id (product_by_id supports it).
      try {
        const res = await api.getProductById({
          id: notification?.type_id,
          latitude: city?.latitude,
          longitude: city?.longitude,
        });
        if (res?.status == 1 && res?.data?.slug) {
          router.push(`/product/${res.data.slug}`);
        } else {
          toast.error(t("no_product_found"));
        }
      } catch (error) {
        console.log("Error", error);
        toast.error(t("something_went_wrong"));
      }
    } else if (notification?.type === "credit") {
      router.push("/profile/wallet-credit");
    } else if (notification?.type === "url") {
      window.open(notification?.link_url, "_blank");
    }
    return;
  };

  return (
    <div className="flex flex-row flex-wrap items-start justify-start gap-4 border-b border-[var(--border-subtle)] p-4 sm:flex-nowrap">
      <div className="h-12 w-12 flex-shrink-0">
        {/* Bell when there's no image, or the URL fails to load (broken icon otherwise). */}
        {notification?.image_url && !imageFailed ? (
          <Image
            src={notification.image_url}
            alt="notificationImg"
            height={96}
            width={96}
            className="h-12 w-12 rounded-sm object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <FaRegBell
            className="h-12 w-12 rounded-sm bg-[var(--brand-foreground-default)] p-2 text-[var(--brand-foreground-inverse)]"
            size={30}
          />
        )}
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-col flex-wrap justify-between gap-1 md:flex-row md:items-center">
          <div
            className="line-clamp-1 cursor-pointer text-base font-semibold leading-6 text-[var(--foreground-primary)]"
            onClick={() => handleCategoryNotificationClick(notification)}
          >
            {(notification?.title?.length as number) > 55
              ? `${notification?.title?.substr(0, 55)}...`
              : notification?.title}
          </div>
          <div className="flex items-center justify-end gap-2 text-[var(--foreground-secondary)]">
            {/* Icon sized to the text's line-height (leading-4 = 16px), not the
                20px default — at 20px the icon's box was taller than the text
                line-box, and items-center then centers each on a different
                axis height, reading as a baseline mismatch. */}
            <IoTimeOutline size={16} className="shrink-0" />
            <div className="text-nowrap text-sm font-normal leading-4">
              {notification?.date_sent}
            </div>
          </div>
        </div>
        <div className="text-sm font-normal leading-5 text-[var(--foreground-secondary)]">
          {notification?.message}
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
