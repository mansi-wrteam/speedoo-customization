import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";
import type { AppDispatch } from "@/redux/hooks";
import { setFcmToken } from "@/redux/slices/userSlice";
import { createStickyNote } from "./stickynote";
import { t } from "./translation";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
let messaging: Messaging | null = null;

// The same keys scripts/generator.js requires before it writes a real worker.
// Without them the worker it ships is a no-op, so push is skipped entirely.
const pushConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (messaging) return messaging;
  if (typeof window === "undefined" || !pushConfigured) return null;

  try {
    const isSupportedBrowser = await isSupported();
    if (isSupportedBrowser) {
      messaging = getMessaging(app);
      return messaging;
    } else {
      if (typeof window !== "undefined" && sessionStorage.getItem("hide-unsupported-browser-note") !== "true") {
        createStickyNote();
      }
      return null;
    }
  } catch (err) {
    console.error("Error checking messaging support:", err);
    return null;
  }
};

export const registerNotificationClickHandler = () => {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "NOTIFICATION_CLICK") {
      const url = event.data.url;
      window.location.replace(url); // replace() avoids adding to browser history
    }
  });
};

// One registration, shared with getToken below. Left to itself getToken
// registers the same file a second time under its own scope, so a broken or
// missing worker failed twice with two different errors.
let workerRegistration: Promise<ServiceWorkerRegistration | null> | null = null;

export const registerServiceWorker = () => {
  if (workerRegistration) return workerRegistration;
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !pushConfigured) {
    return Promise.resolve(null);
  }
  workerRegistration = navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      // Ask the browser to re-check the script on every load so SW edits
      // actually land during debugging.
      registration.update().catch(() => {});
      return registration;
    })
    .catch((err) => {
      console.error("[push] service worker registration failed:", err);
      return null;
    });
  return workerRegistration;
};

export const fetchToken = async (dispatch: AppDispatch) => {
  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) return;

    const permission = await Notification.requestPermission();
    // Declined or dismissed: no token, nothing to report.
    if (permission !== "granted") return;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error(
        "[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing — getToken will fail."
      );
    }

    // No worker means no token; getToken would only fail again trying to
    // register one itself.
    const serviceWorkerRegistration = await registerServiceWorker();
    if (!serviceWorkerRegistration) return;

    const currentToken = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration,
    });

    if (currentToken) {
      dispatch(setFcmToken({ data: currentToken }));
    }
  } catch (err) {
    console.error("[push] error retrieving FCM token:", err);
  }
};

/**
 * Fired for every foreground push about an order, so an open order summary can
 * re-read itself instead of showing a stale status (WEB_PARITY_V4.0.2 §2.5).
 *
 * A DOM event rather than a callback: the screens that care mount and unmount
 * independently of the push listener, which is set up once at the app root.
 */
export const ORDER_PUSH_EVENT = "egrocer:order-push";

export interface OrderPushDetail {
  orderId?: string;
}

const announceOrderPush = (data: { type?: string; id?: string }) => {
  if (typeof window === "undefined") return;
  // The backend sends `type` as "order" for status changes and
  // "return_request" for returns; both describe an order the customer may be
  // looking at.
  if (data?.type !== "order" && data?.type !== "return_request") return;
  window.dispatchEvent(
    new CustomEvent<OrderPushDetail>(ORDER_PUSH_EVENT, { detail: { orderId: data?.id } })
  );
};

export const onMessageListener = () => {
  return new Promise<MessagePayload | null>(async (resolve) => {
    const messagingInstance = await getMessagingInstance();
    if (messagingInstance) {
      // This callback runs for EVERY foreground message; only the promise
      // around it settles once.
      onMessage(messagingInstance, (payload) => {
        const data = payload.data || {};
        announceOrderPush(data);
        // A `notification` block means PushNotification.jsx's handler already
        // shows this one (using notification.title/body) — only act here when
        // it's a pure data-only message, and only if it actually has a title.
         if (Notification.permission === "granted" && !payload.notification && data.title) {
          const notification = new Notification(data.title, {
            body: data.body,
            icon: data.icon,
            image: data.image,
            data: {
              type: data.type,
              id: data.id,
              url: getRedirectUrl(data),
              slug: data.type_slug,
            },
          } as NotificationOptions);

          // ✅ Handle click on foreground notification
          notification.onclick = () => {
            const targetUrl = getRedirectUrl(data);
            window.focus();
            window.location.href = targetUrl;
            notification.close();
          };
        }
        resolve(payload);
      });
    } else {
      resolve(null);

    }
  });
};

export const getRedirectUrl = (data: { type?: string; id?: string; type_slug?: string } | null | undefined): string => {
  const { type, id,type_slug } = data || {};
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const productRequestURL = type_slug == "" ? `${base}/profile/requested-products` : `${base}/product/${type_slug}`;


  switch (type) {
    case "order":
      return `${base}/order-detail/${id}`;
    case "product":
      return `${base}/product/${type_slug}`;
    case "category":
      return `${base}/categories/all`;
    case "cart":
      return `${base}/checkout`;
    case "product_request":
      return productRequestURL;
    default:
      return `${base}/`;
  }
};


// Map a Firebase Auth error to a user-friendly, translated message.
// Falls back to the raw Firebase message when the code isn't mapped.
export const getFirebaseAuthErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string } | null | undefined)?.code || "";
  const message = (error as { message?: string } | null | undefined)?.message || "";
  if (
    code === "auth/too-many-requests" ||
    message.includes("auth/too-many-requests")
  ) {
    return t("firebase_temp_block");
  }
  return message;
};

export { app, auth };
