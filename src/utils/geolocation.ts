import { t } from "@/utils/translation";

/** What to tell the customer when the browser could not give a position. */
export const geolocationErrorMessage = (error: GeolocationPositionError): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return t("location_permission_denied") || "Please enable location permission in your browser";
    case error.POSITION_UNAVAILABLE:
      return t("location_unavailable") || "Location information is unavailable";
    case error.TIMEOUT:
      return t("location_timeout") || "Location request timed out";
    default:
      return t("location_error") || "An unknown error occurred while getting location";
  }
};
