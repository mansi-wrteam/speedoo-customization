import React, { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/utils/geo";
import type { PickerMapProps } from "./LocationPickerMap";

/** MapContainer only reads `center` once; follow it when the parent moves it. */
const FollowCenter = ({ center }: { center: LatLng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);
  return null;
};

/**
 * Leaflet measures its box once. Inside a dialog that box is still animating
 * open, so it measures wrong and leaves grey, half-loaded tiles. Re-measure
 * whenever the box changes size.
 */
const KeepSized = () => {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const ClickToPick =({ onPick }: { onPick?: (point: LatLng) => void }) => {
  useMapEvents({
    click: (event) => onPick?.({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
};

// Leaflet's default marker images do not survive bundling, so draw the pin.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 28 16 28s16-16 16-28C32 7.2 24.8 0 16 0z" fill="var(--brand-foreground-default, #55AE7B)"/><circle cx="16" cy="16" r="6" fill="#fff"/></svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
});

const OsmPickerMap = ({
  center,
  zoom,
  height,
  dark = false,
  tiles,
  onMapClick,
  onMarkerDragStart,
  onMarkerDragEnd,
}: PickerMapProps) => {
  const point = center ?? { lat: 0, lng: 0 };

  return (
    <MapContainer
      center={[point.lat, point.lng]}
      zoom={zoom}
      scrollWheelZoom
      style={{ width: "100%", height }}
    >
      <TileLayer
        url={tiles.url}
        attribution={tiles.attribution}
        className={dark ? "[filter:invert(1)_hue-rotate(180deg)_brightness(0.9)_contrast(0.9)]" : undefined}
      />
      <KeepSized />
      <FollowCenter center={point} />
      <ClickToPick onPick={onMapClick} />
      <Marker
        position={[point.lat, point.lng]}
        icon={pinIcon}
        draggable
        eventHandlers={{
          dragstart: () => onMarkerDragStart?.(),
          dragend: (event) => {
            const { lat, lng } = (event.target as L.Marker).getLatLng();
            onMarkerDragEnd({ lat, lng });
          },
        }}
      />
    </MapContainer>
  );
};

export default OsmPickerMap;
