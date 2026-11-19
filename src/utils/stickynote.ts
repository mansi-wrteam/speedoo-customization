import { getActiveStore } from "@/redux/storeAccess";
import { t } from "@/utils/translation";

export const createStickyNote = () => {
  if (typeof window !== "undefined" && sessionStorage.getItem("hide-unsupported-browser-note") === "true") return;
  if (document.getElementById("unsupported-browser-note")) return;

  const store = getActiveStore();
  const setting = store.getState()?.Setting?.setting;
  const theme = store.getState()?.Theme.theme;

  // Built with raw DOM APIs, so Tailwind classes can't be used — read the
  // Kigen tokens off the document instead of hardcoding colours.
  const token = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const appUrl = setting?.web_settings?.ios_app_url;

  const stickyNote = document.createElement("div");
  stickyNote.id = "unsupported-browser-note";
  stickyNote.style.position = "fixed";
  stickyNote.style.bottom = "0";
  stickyNote.style.left = "0";
  stickyNote.style.width = "100%";
  stickyNote.style.backgroundColor = token("--surface-default");
  stickyNote.style.color = token("--foreground-primary");
  stickyNote.style.padding = "15px";
  stickyNote.style.textAlign = "center";
  stickyNote.style.fontSize = "14px";
  stickyNote.style.zIndex = "99999";
  stickyNote.style.boxShadow = "0 -2px 10px rgba(0,0,0,0.1)";
  stickyNote.style.display = "flex";
  stickyNote.style.justifyContent = "center";
  stickyNote.style.alignItems = "center";

  const textNode = document.createElement("span");
  textNode.innerText = t("chat_and_notification_not_supported");
  stickyNote.appendChild(textNode);

  if (appUrl) {
    const link = document.createElement("a");
    link.style.textDecoration = "underline";
    link.style.color = token("--button-link-foreground-default");
    link.style.marginLeft = "10px";
    link.innerText = t("download_now");
    link.href = appUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    stickyNote.appendChild(link);
  }

  const closeButton = document.createElement("span");
  closeButton.style.cursor = "pointer";
  closeButton.style.marginLeft = "20px";
  closeButton.style.fontSize = "20px";
  closeButton.style.lineHeight = "1";
  closeButton.innerHTML = "×";
  closeButton.onclick = function () {
    document.body.removeChild(stickyNote);
    sessionStorage.setItem("hide-unsupported-browser-note", "true");
  };
  stickyNote.appendChild(closeButton);

  document.body.appendChild(stickyNote);
};
