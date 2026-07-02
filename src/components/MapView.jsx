// src/components/MapView.jsx
// Interactive Google Map showing:
//   - User's current GPS location (blue)
//   - Flood-prone zones (red = high, orange = moderate)
//   - Safe zones / evacuation centers (green)
//   - Walking route as a dashed blue Polyline
// Clicking any pin opens an InfoWindow with details.

import OfflineBanner from "./OfflineBanner";
import { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  Polyline,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  MAPS_API_KEY,
  MAPS_LIBRARIES,
  METRO_MANILA_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLE,
} from "../services/mapsConfig";

import { getMarkerIcon }    from "../utils/mapIcons";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import floodZones           from "../data/floodZones.json";
import safeZones            from "../data/safeZones.json";
import "./MapView.css";

// ── Props ─────────────────────────────────────────────────────────────────────
// userLocation     : { lat, lng } | null  — from App.jsx
// routePoints      : Array<{ lat, lng }> | null — polyline path from routingService
// onSafeZoneSelect : (safeZone) => void — called when user picks a safe zone
// onMapReady       : (directionsService) => void — passes DirectionsService up to App

export default function MapView({
  userLocation,
  routePoints,
  onSafeZoneSelect,
  onMapReady,
}) {
  const isOnline = useOfflineStatus();

  // which pin's InfoWindow is currently open
  const [activePin, setActivePin] = useState(null);

  // ref to the map instance for programmatic control
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
    libraries:        MAPS_LIBRARIES,
  });

  // store map instance + initialize DirectionsService on load
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;

    // instantiate DirectionsService here — the Maps JS API is guaranteed
    // to be loaded at this point, so window.google.maps is safe to access
    if (window.google && onMapReady) {
      const directionsService = new window.google.maps.DirectionsService();
      onMapReady(directionsService);
    }
  }, [onMapReady]);

  // pan to user location once map is idle and userLocation is available
  const onMapIdle = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation);
    }
  }, [userLocation]);

  // ── Error / loading states ─────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="map-view map-view--error">
        <span>⚠️ Map failed to load. Check your API key.</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-view map-view--loading">
        <div className="map-view__spinner" />
        <span>Loading map...</span>
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const closeInfoWindow = () => setActivePin(null);

  const handleSafeZoneClick = (zone) => {
    setActivePin({ type: "safe", data: zone });
    if (onSafeZoneSelect) onSafeZoneSelect(zone);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="map-view">

      {/* offline notice bar */}
      <OfflineBanner
        isOnline={isOnline}
        lastSyncedAt={null}
        message="Offline — map tiles limited to previously viewed areas"
        compact
      />

      <GoogleMap
        mapContainerClassName="map-view__container"
        center={userLocation || METRO_MANILA_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        onIdle={onMapIdle}
        options={{
          styles:            MAP_STYLE,
          disableDefaultUI:  false,
          zoomControl:       true,
          mapTypeControl:    false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
        onClick={closeInfoWindow}
      >

        {/* ── User location pin (blue) ── */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={getMarkerIcon("user")}
            title="Your location"
            zIndex={100}
            onClick={() =>
              setActivePin({ type: "user", data: userLocation })
            }
          />
        )}

        {/* ── Flood zone pins ── */}
        {floodZones.map((zone) => (
          <Marker
            key={zone.id}
            position={{ lat: zone.lat, lng: zone.lng }}
            icon={getMarkerIcon(
              zone.baseRiskLevel === "high" ? "flood-high" : "flood-moderate"
            )}
            title={zone.name}
            onClick={() =>
              setActivePin({ type: "flood", data: zone })
            }
          />
        ))}

        {/* ── Safe zone pins (green) ── */}
        {safeZones.map((zone) => (
          <Marker
            key={zone.id}
            position={{ lat: zone.lat, lng: zone.lng }}
            icon={getMarkerIcon("safe")}
            title={zone.name}
            onClick={() => handleSafeZoneClick(zone)}
          />
        ))}

        {/* ── Route Polyline ── */}
        {routePoints && routePoints.length > 0 && (
          <Polyline
            path={routePoints}
            options={{
              strokeColor:   "#2B6FD1",
              strokeOpacity: 0,        // set to 0 so the icon dash pattern shows cleanly
              strokeWeight:  5,
              geodesic:      true,
              icons: [
                {
                  // dashed line effect using a repeated short stroke symbol
                  icon: {
                    path:           "M 0,-1 0,1",
                    strokeOpacity:  1,
                    strokeColor:    "#2B6FD1",
                    strokeWeight:   5,
                    scale:          4,
                  },
                  offset: "0",
                  repeat: "18px",
                },
              ],
            }}
          />
        )}

        {/* ── InfoWindow — renders for whichever pin is active ── */}
        {activePin && (
          <InfoWindow
            position={
              activePin.type === "user"
                ? activePin.data
                : { lat: activePin.data.lat, lng: activePin.data.lng }
            }
            onCloseClick={closeInfoWindow}
          >
            <div className="map-view__infowindow">

              {/* user pin InfoWindow */}
              {activePin.type === "user" && (
                <>
                  <p className="map-view__iw-title">📍 Your Location</p>
                  <p className="map-view__iw-detail">
                    {activePin.data.lat.toFixed(4)},{" "}
                    {activePin.data.lng.toFixed(4)}
                  </p>
                </>
              )}

              {/* flood zone InfoWindow */}
              {activePin.type === "flood" && (
                <>
                  <p className="map-view__iw-title">
                    {activePin.data.baseRiskLevel === "high" ? "🔴" : "🟡"}{" "}
                    {activePin.data.name}
                  </p>
                  <p className="map-view__iw-city">{activePin.data.city}</p>
                  <p className="map-view__iw-detail">
                    {activePin.data.description}
                  </p>
                  <span
                    className={`map-view__iw-badge map-view__iw-badge--${activePin.data.baseRiskLevel}`}
                  >
                    {activePin.data.baseRiskLevel.toUpperCase()} RISK ZONE
                  </span>
                </>
              )}

              {/* safe zone InfoWindow */}
              {activePin.type === "safe" && (
                <>
                  <p className="map-view__iw-title">
                    🟢 {activePin.data.name}
                  </p>
                  <p className="map-view__iw-city">{activePin.data.city}</p>
                  <button
                    className="map-view__iw-route-btn"
                    onClick={() => {
                      if (onSafeZoneSelect) onSafeZoneSelect(activePin.data);
                      closeInfoWindow();
                    }}
                  >
                    Get route here →
                  </button>
                </>
              )}

            </div>
          </InfoWindow>
        )}

      </GoogleMap>

      {/* ── Map legend ── */}
      <div className="map-view__legend">
        <span className="map-view__legend-item">
          <i className="map-view__dot map-view__dot--user" /> You
        </span>
        <span className="map-view__legend-item">
          <i className="map-view__dot map-view__dot--flood-high" /> Flood zone (high)
        </span>
        <span className="map-view__legend-item">
          <i className="map-view__dot map-view__dot--flood-mod" /> Flood zone (mod)
        </span>
        <span className="map-view__legend-item">
          <i className="map-view__dot map-view__dot--safe" /> Safe zone
        </span>
        {/* only show route legend item when a route is active */}
        {routePoints && routePoints.length > 0 && (
          <span className="map-view__legend-item">
            <i className="map-view__dot map-view__dot--route" /> Route
          </span>
        )}
      </div>

    </div>
  );
}