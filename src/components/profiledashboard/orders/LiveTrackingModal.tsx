import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { useSelector } from "react-redux";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiCloseFill } from "react-icons/ri";
import { BiPhoneCall } from "react-icons/bi";
import { IoLocationOutline } from "react-icons/io5";
import { MdOutlineWatchLater } from "react-icons/md";
import Loader from "@/components/loader/Loader";
import { t } from "@/utils/translation";
import { useTintedSvg } from "@/utils/useTintedSvg";
import { toLatLng } from "@/utils/geo";
import { getMapProvider, getTileConfig } from "@/utils/mapProvider";
import { useRiderTracking } from "@/utils/useRiderTracking";
import { formatDuration } from "@/utils/apiDate";
import userIcon from "@/assets/customer_location.svg?url";
import deliveryBoyIcon from "@/assets/delivery_boy.svg?url";
import type { Order } from "@/types/models";
import type { RootState } from "@/types/state";

// Both map clients are heavy and only one is ever used, so neither is in the
// bundle until this modal opens.
const GoogleTrackingMap = dynamic(() => import("@/components/map/GoogleTrackingMap"), {
  ssr: false,
  loading: () => <Loader />,
});
const OsmTrackingMap = dynamic(() => import("@/components/map/OsmTrackingMap"), {
  ssr: false,
  loading: () => <Loader />,
});

export interface LiveTrackingModalProps {
  showLiveTracking: boolean;
  setShowLiveTracking: React.Dispatch<React.SetStateAction<boolean>>;
  order?: Order;
}

/**
 * Order tracking (WEB_PARITY_V4.0.2 §3).
 *
 * The map is Google or OpenStreetMap depending on the shop's `map_provider`
 * (§4), the rider's position comes from Pusher/Reverb with a poll behind it
 * (§3.4), and the road line comes from the backend — never from a client-side
 * Directions call, which is what this used to do.
 */
const LiveTrackingModal = ({
  showLiveTracking,
  setShowLiveTracking,
  order,
}: LiveTrackingModalProps) => {
  const setting = useSelector((state: RootState) => state.Setting.setting);
  const { theme } = useTheme();

  // The scooter has its own colours and is NOT re-tinted: running it through
  // the brand-token swap turned the whole thing green. The customer pin still
  // is, because it is a plain brand-coloured marker.
  // `?url` gives a string in the app build but is typed as the wider
  // next/image import, so narrow it for the map components.
  const riderMarker =
    typeof deliveryBoyIcon === "string" ? deliveryBoyIcon : (deliveryBoyIcon as { src: string }).src;
  const userMarker = useTintedSvg(
    userIcon,
    { "#55AE7B": "--brand-foreground-default" },
    theme
  );

  const destination = useMemo(
    () => toLatLng(order?.latitude, order?.longitude),
    [order?.latitude, order?.longitude]
  );

  const { rider, route, durationSeconds, heading, unavailable, refresh } = useRiderTracking({
    orderId: order?.id,
    destination,
    active: showLiveTracking,
  });

  const provider = getMapProvider(setting);
  const tiles = getTileConfig(setting);
  const isDark = theme === "dark";

  // Only when there IS a road time: `duration: 0` is the straight-line
  // fallback, not an arrival (trap 7).
  const eta =
    durationSeconds != null
      ? formatDuration(Math.ceil(durationSeconds / 60), {
          minute: t("minutes"),
          hour: t("hours"),
        })
      : null;

  const routeColor =
    typeof window === "undefined"
      ? "#16a34a"
      : getComputedStyle(document.documentElement)
          .getPropertyValue("--status-success-default")
          .trim() || "#16a34a";

  return (
    <Dialog open={showLiveTracking}>
      <DialogContent className="w-full max-w-[752px] gap-0 overflow-hidden rounded-2xl bg-[var(--surface-default)] p-0">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[var(--border-subtle)] p-4">
          <DialogTitle className="text-xl font-semibold text-[var(--foreground-primary)]">
            {t("livetracking")}
          </DialogTitle>
          <button
            type="button"
            onClick={() => setShowLiveTracking(false)}
            aria-label={t("close")}
          >
            <RiCloseFill size={22} className="text-[var(--button-link-foreground-default)]" />
          </button>
        </DialogHeader>

        <div className="relative h-80 w-full">
          {provider === "osm" ? (
            <OsmTrackingMap
              rider={rider}
              destination={destination}
              route={route}
              heading={heading}
              riderIcon={riderMarker!}
              destinationIcon={userMarker!}
              tiles={tiles}
              dark={isDark}
              routeColor={routeColor}
            />
          ) : (
            <GoogleTrackingMap
              rider={rider}
              destination={destination}
              route={route}
              heading={heading}
              riderIcon={riderMarker!}
              destinationIcon={userMarker!}
              routeColor={routeColor}
            />
          )}

          {/* Top-right, where the bottom card cannot cover it (§4). */}
          {provider === "osm" && (
            <span className="pointer-events-none absolute right-2 top-2 z-[500] rounded bg-[var(--surface-default)]/85 px-2 py-0.5 text-[10px] text-[var(--foreground-tertiary)]">
              {tiles.attribution}
            </span>
          )}

          {unavailable && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[var(--surface-default)]/90">
              <div className="flex flex-col items-center gap-3 rounded-lg bg-[var(--surface-default)] p-5 text-center shadow-md">
                <p className="font-bold text-[var(--status-error-default)]">
                  {t("delivery_boy_not_live_yet")}
                </p>
                <button
                  type="button"
                  onClick={refresh}
                  className="rounded-lg bg-[var(--button-primary-background-default)] px-4 py-2 text-sm font-medium text-[var(--button-primary-foreground-default)]"
                >
                  {t("try_again")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6">
          {eta && (
            <div className="flex items-center gap-2 text-[var(--status-success-foreground)]">
              <MdOutlineWatchLater size={18} />
              <span className="text-base font-semibold">{`${t("arriving_in")} ${eta}`}</span>
            </div>
          )}

          <div className="w-full rounded-lg bg-[var(--brand-background-subtle)] p-4">
            <div className="flex items-center gap-4">
              <div className="flex shrink-0 items-center justify-center rounded-lg bg-[var(--brand-foreground-default)] p-2">
                <IoLocationOutline size={28} className="text-[var(--brand-foreground-inverse)]" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-xl font-medium text-[var(--foreground-primary)]">
                  {t("deliveryAddress")}
                </p>
                <p className="text-base font-normal text-[var(--foreground-secondary)]">
                  {order?.address}
                </p>
              </div>
            </div>
          </div>

          {order?.delivery_boy_name && (
            <div className="flex w-full flex-col gap-2">
              <p className="text-xl font-medium text-[var(--foreground-primary)]">
                {t("delivery_partner_details ")}
              </p>
              <div className="rounded-2xl bg-[var(--surface-subtle)] p-4">
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 className="text-base font-semibold text-[var(--foreground-secondary)]">
                      {order?.delivery_boy_name}
                    </h2>
                    <p className="text-base font-normal text-[var(--foreground-secondary)]">
                      {order?.delivery_boy_mobile}
                    </p>
                  </div>
                  <a
                    href={`tel:${order?.delivery_boy_mobile || ""}`}
                    className="flex shrink-0 items-center justify-center rounded-lg bg-[var(--button-secondary-border-default)] p-3 text-[var(--button-secondary-foreground-default)]"
                    aria-label={t("call")}
                  >
                    <BiPhoneCall size={24} />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveTrackingModal;
