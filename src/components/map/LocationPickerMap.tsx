import React from "react";
import dynamic from "next/dynamic";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import Loader from "@/components/loader/Loader";
import { darkThemeStyles } from "@/utils/mapColor";
import type { LatLng } from "@/utils/geo";
import type { MapProvider, TileConfig } from "@/utils/mapProvider";

// Leaflet touches `window` on import, so it is only loaded in the browser and
// only for OSM shops.
const OsmPickerMap = dynamic(() => import("./OsmPickerMap"), {
  ssr: false,
  loading: () => <Loader />,
});

export interface PickerMapProps {
  center: LatLng | undefined;
  zoom: number;
  /** CSS height of the map box. */
  height: string;
  dark?: boolean;
  tiles: TileConfig;
  onMapClick?: (point: LatLng) => void;
  onMarkerDragStart?: () => void;
  onMarkerDragEnd: (point: LatLng) => void;
}

/**
 * The draggable-pin map in the location and address modals (§4): Google or
 * OpenStreetMap depending on the shop's `map_provider`. For Google, render it
 * only once `useMapReady` says the script is loaded.
 */
const LocationPickerMap = ({ provider, ...props }: PickerMapProps & { provider: MapProvider }) => {
  if (provider === "osm") return <OsmPickerMap {...props} />;

  const { center, zoom, height, dark, onMapClick, onMarkerDragStart, onMarkerDragEnd } = props;
  return (
    <GoogleMap
      options={{
        streetViewControl: false,
        styles: dark ? darkThemeStyles : [],
      }}
      zoom={zoom}
      center={center}
      mapContainerStyle={{ width: "100%", height }}
      onClick={(e) => e.latLng && onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
    >
      <MarkerF
        position={center!}
        draggable={true}
        onDragStart={onMarkerDragStart}
        onDragEnd={(e) => e.latLng && onMarkerDragEnd({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
      />
    </GoogleMap>
  );
};

export default LocationPickerMap;
