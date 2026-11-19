import React, { useEffect, useRef } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { boundsOf, type LatLng } from "@/utils/geo";
import type { TileConfig } from "@/utils/mapProvider";

export interface OsmTrackingMapProps {
  rider: LatLng | null;
  destination: LatLng | null;
  /** Already trimmed to the rider; empty means draw no line. */
  route: LatLng[];
  /** Compass bearing for the scooter. */
  heading: number;
  riderIcon: string;
  destinationIcon: string;
  tiles: TileConfig;
  /** Dark theme inverts the tiles — OSM ships no dark raster set (§4). */
  dark?: boolean;
  routeColor: string;
}

/**
 * Frames the journey once, then leaves the map alone.
 *
 * This used to re-fit on every render. `points` is a fresh array each time, so
 * the effect ran on every rider update — zoom out to see the route and it
 * snapped straight back a second later. Now it frames the first time it has
 * something to frame, and any pan or zoom by hand stops it for good.
 */
const FitToJourney = ({ rider, destination }: { rider: LatLng | null; destination: LatLng | null }) => {
  const map = useMap();
  const hasFitted = useRef(false);
  const userTookOver = useRef(false);

  useEffect(() => {
    const release = () => {
      userTookOver.current = true;
    };
    // `dragstart` and `zoomstart` fire for programmatic moves too, so listen
    // for the input events instead: these only come from the person.
    map.on("mousedown", release);
    map.on("wheel", release);
    map.on("dragstart", release);
    return () => {
      map.off("mousedown", release);
      map.off("wheel", release);
      map.off("dragstart", release);
    };
  }, [map]);

  useEffect(() => {
    if (hasFitted.current || userTookOver.current) return;
    const bounds = boundsOf([rider, destination]);
    if (!bounds) return;
    const [south, north] = bounds;
    hasFitted.current = true;
    if (south.lat === north.lat && south.lng === north.lng) {
      map.setView([south.lat, south.lng], 16);
      return;
    }
    map.fitBounds(
      [
        [south.lat, south.lng],
        [north.lat, north.lng],
      ],
      { padding: [40, 40] }
    );
  }, [destination, map, rider]);

  return null;
};

/**
 * The scooter is anchored at its centre and rotated to the bearing, so it
 * turns with the map rather than with the screen (§3.5).
 */
const scooterIcon = (url: string, heading: number) =>
  L.divIcon({
    className: "",
    html: `<img src="${url}" alt="" style="width:56px;height:56px;transform:rotate(${heading}deg);transform-origin:50% 50%;" />`,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });

const pinIcon = (url: string) =>
  L.divIcon({
    className: "",
    html: `<img src="${url}" alt="" style="width:40px;height:40px;" />`,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
  });

const OsmTrackingMap = ({
  rider,
  destination,
  route,
  heading,
  riderIcon,
  destinationIcon,
  tiles,
  dark = false,
  routeColor,
}: OsmTrackingMapProps) => {
  const centre = rider ?? destination ?? { lat: 0, lng: 0 };

  return (
    <MapContainer
      center={[centre.lat, centre.lng]}
      zoom={15}
      scrollWheelZoom
      className="h-full w-full"
      // The credit has to stay visible, so the default corner control is
      // replaced by one the bottom card cannot cover (§4).
      attributionControl={false}
    >
      <TileLayer
        url={tiles.url}
        className={dark ? "[filter:invert(1)_hue-rotate(180deg)_brightness(0.9)_contrast(0.9)]" : undefined}
      />
      {route.length > 1 && (
        <Polyline positions={route.map((point) => [point.lat, point.lng])} pathOptions={{ color: routeColor, weight: 6, opacity: 0.9 }} />
      )}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={pinIcon(destinationIcon)} />
      )}
      {rider && <Marker position={[rider.lat, rider.lng]} icon={scooterIcon(riderIcon, heading)} />}
      <FitToJourney rider={rider} destination={destination} />
    </MapContainer>
  );
};

export default OsmTrackingMap;
