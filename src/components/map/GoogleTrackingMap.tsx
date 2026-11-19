import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import Loader from "@/components/loader/Loader";
import { MAP_CONFIG } from "@/utils/mapConfig";
import { boundsOf, type LatLng } from "@/utils/geo";

export interface GoogleTrackingMapProps {
  rider: LatLng | null;
  destination: LatLng | null;
  /** Already trimmed to the rider; empty means draw no line. */
  route: LatLng[];
  heading: number;
  riderIcon: string;
  destinationIcon: string;
  routeColor: string;
  onLoadError?: () => void;
}

const containerStyle = { width: "100%", height: "100%" };

const GoogleTrackingMap = ({
  rider,
  destination,
  route,
  heading,
  riderIcon,
  destinationIcon,
  routeColor,
  onLoadError,
}: GoogleTrackingMapProps) => {
  const { isLoaded, loadError } = useJsApiLoader(MAP_CONFIG);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const hasFitted = useRef(false);
  const userTookOver = useRef(false);

  useEffect(() => {
    if (loadError) onLoadError?.();
  }, [loadError, onLoadError]);

  // Frame the journey once, then leave the map alone — re-fitting on every
  // rider update fought anyone trying to zoom out and look around.
  useEffect(() => {
    if (!map || hasFitted.current || userTookOver.current) return;
    const bounds = boundsOf([rider, destination]);
    if (!bounds) return;
    const [south, north] = bounds;
    hasFitted.current = true;
    if (south.lat === north.lat && south.lng === north.lng) {
      map.setCenter({ lat: south.lat, lng: south.lng });
      map.setZoom(16);
      return;
    }
    map.fitBounds(
      new window.google.maps.LatLngBounds(
        { lat: south.lat, lng: south.lng },
        { lat: north.lat, lng: north.lng }
      ),
      40
    );
  }, [destination, map, rider]);

  // Only a real gesture counts: `dragstart` and `zoom_changed` also fire for
  // the programmatic fit above.
  useEffect(() => {
    if (!map) return;
    const release = () => {
      userTookOver.current = true;
    };
    const listeners = [
      map.addListener("dragstart", release),
      map.addListener("mousedown", release),
    ];
    return () => listeners.forEach((listener) => listener.remove());
  }, [map]);

  const onLoad = useCallback((instance: google.maps.Map) => setMap(instance), []);
  const onUnmount = useCallback(() => setMap(null), []);

  if (!isLoaded) return <Loader />;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={rider ?? destination ?? { lat: 0, lng: 0 }}
      zoom={15}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{ streetViewControl: false, mapTypeControl: false }}
    >
      {route.length > 1 && (
        <Polyline
          path={route}
          options={{ strokeColor: routeColor, strokeOpacity: 0.9, strokeWeight: 6 }}
        />
      )}
      {destination && (
        <Marker
          position={destination}
          icon={{
            url: destinationIcon,
            scaledSize: new window.google.maps.Size(40, 40),
          }}
        />
      )}
      {rider && (
        <Marker
          position={rider}
          icon={{
            url: riderIcon,
            scaledSize: new window.google.maps.Size(56, 56),
            // Anchored at its centre so rotation spins the scooter in place
            // rather than swinging it around a corner (§3.5).
            anchor: new window.google.maps.Point(28, 28),
            rotation: heading,
          }}
        />
      )}
    </GoogleMap>
  );
};

export default GoogleTrackingMap;
