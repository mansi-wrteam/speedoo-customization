importScripts(
  "https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID",
  measurementId: "FIREBASE_MEASUREMENT_ID",
});

// Bump this on every edit to this file. It is logged on install/activate and
// on each message, so you can tell from the console whether the browser is
// running this version or a stale cached one.
const SW_VERSION = "2026-09-28.1";

self.addEventListener("install", () => {
  console.log(`[push-sw ${SW_VERSION}] install — calling skipWaiting()`);
  // Without this a new SW sits in "waiting" until every tab is closed, so
  // fixes appear not to deploy.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log(`[push-sw ${SW_VERSION}] activate — claiming clients`);
  event.waitUntil(self.clients.claim());
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notif = payload.notification || {};

  console.groupCollapsed(`[push-sw ${SW_VERSION}] onBackgroundMessage`);
  console.log("full payload:", JSON.stringify(payload, null, 2));
  console.log("payload.notification:", notif);
  console.log("payload.data:", data);
  console.log("resolved title:", notif.title ?? data.title);
  console.log("resolved body:", notif.body ?? data.body);
  console.log("data keys:", Object.keys(data));
  console.groupEnd();

  // The Firebase Console composer sends a `notification` block; the backend
  // sends `data`. Read whichever is present.
  const title = notif.title || data.title;
  const body = notif.body || data.body;
  const icon = notif.icon || data.icon;

  if (!title) {
    console.warn(
      `[push-sw ${SW_VERSION}] no title in notification or data — skipping. ` +
        `Sender must set notification.title or data.title.`
    );
    return;
  }

  // A payload carrying a `notification` block is auto-displayed by the browser.
  // Showing it again here would produce a duplicate.
  if (notif.title) {
    console.log(
      `[push-sw ${SW_VERSION}] notification block present — browser displays it, not us`
    );
    return;
  }

  console.log(`[push-sw ${SW_VERSION}] showNotification("${title}")`);
  self.registration.showNotification(title, { body, icon, data });
});

// Clicking a notification focuses an open tab of the site (or opens one) and
// tells the page where to go: src/utils/firebase.ts listens for
// { type: "NOTIFICATION_CLICK", url }. The target comes from the payload's
// `url` or `click_action` when the sender sets one, otherwise the home page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || data.click_action || "/";
  console.log(`[push-sw ${SW_VERSION}] notificationclick -> ${url}`);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        client.postMessage({ type: "NOTIFICATION_CLICK", url });
      } else {
        await self.clients.openWindow(url);
      }
    })()
  );
});
