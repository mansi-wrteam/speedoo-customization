"use client";

import { useEffect } from "react";
import type React from "react";
import { useDispatch } from "react-redux";
import {
  fetchToken,
  onMessageListener,
  registerServiceWorker,

} from "@/utils/firebase";
import type { AppDispatch } from "@/redux/hooks";

export interface PushNotificationLayoutProps {
  children?: React.ReactNode;
}

const PushNotificationLayout = ({ children }: PushNotificationLayoutProps) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    registerServiceWorker();
    fetchToken(dispatch);
    const unsubscribe = onMessageListener()
      .then((payload) => {
        if (payload?.notification?.title) {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: payload.notification.icon,
          });
        }
      })
      .catch((err) =>
        console.error("[push] failed to listen for foreground messages:", err)
      );

    return () => { };
  }, [dispatch]);

  return <>{children}</>;
};

export default PushNotificationLayout;
