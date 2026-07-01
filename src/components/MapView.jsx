// src/components/MapView.jsx
// Interactive Google Map showing:
//   - User's current GPS location (blue)
//   - Flood-prone zones (red = high, orange = moderate)
//   - Safe zones / evacuation centers (green)
// Clicking any pin opens an InfoWindow with details.
// Passes user location and selected safe zone up to parent via props
// so the routing task (2.4) can use them.

import { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";

import {
  MAPS_API_KEY,
  MAPS_LIBRARIES,
  METRO_MANILA_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLE,
} from "../services/mapsConfig";

import { getMarkerIcon }   from "../utils/mapIcons";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import floodZones           from "../data/floodZones.json";
import safeZones            from "../data/safeZones.json";
import "./MapView.css";

// ── Props ────────────────────────────────────────────────────────────────────
// userLocation  : { lat, lng } | null  — passed down from App.jsx
// onSafeZoneSelect : (safeZone) => void — called when user picks a safe zone
//                                         (used in task 2.4 for routing)

export default function MapView({ userLocation, onSafeZoneSelect }) {
  const isOnline = useOfflineStatus();

  // which pin's InfoWindow is open — stores the pin object or null
  const [activePin, setActivePin] = useState(null);

  // keep a ref to the map instance for programmatic control later
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
    libraries:        MAPS_LIBRARIES,
  });

  // store map instance on load
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // center map on user when their location becomes available
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
      {!isOnline && (
        <div className="map-view__offline-bar">
          📵 Offline — map tiles may be limited to cached areas
        </div>
      )}

      <GoogleMap
        mapContainerClassName="map-view__container"
        center={userLocation || METRO_MANILA_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        onIdle={onMapIdle}
        options={{
          styles:           MAP_STYLE,
          disableDefaultUI: false,
          zoomControl:      true,
          mapTypeControl:   false,   // keep UI clean
          streetViewControl: false,
          fullscreenControl: true,
        }}
        onClick={closeInfoWindow}   // close any open InfoWindow on map click
      >

        {/* ── User location pin (blue) ── */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={getMarkerIcon("user")}
            title="Your location"
            zIndex={100}            // always on top
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
              {activePin.type === "user" && (
                <>
                  <p className="map-view__iw-title">📍 Your Location</p>
                  <p className="map-view__iw-detail">
                    {activePin.data.lat.toFixed(4)}, {activePin.data.lng.toFixed(4)}
                  </p>
                </>
              )}

              {activePin.type === "flood" && (
                <>
                  <p className="map-view__iw-title">
                    {activePin.data.baseRiskLevel === "high" ? "🔴" : "🟡"}{" "}
                    {activePin.data.name}
                  </p>
                  <p className="map-view__iw-city">{activePin.data.city}</p>
                  <p className="map-view__iw-detail">{activePin.data.description}</p>
                  <span className={`map-view__iw-badge map-view__iw-badge--${activePin.data.baseRiskLevel}`}>
                    {activePin.data.baseRiskLevel.toUpperCase()} RISK ZONE
                  </span>
                </>
              )}

              {activePin.type === "safe" && (
                <>
                  <p className="map-view__iw-title">🟢 {activePin.data.name}</p>
                  <p className="map-view__iw-city">{activePin.data.city}</p>
                  <p className="map-view__iw-detail">
                    📍 {activePin.data.address}
                  </p>
                  <p className="map-view__iw-detail">
                    👥 Capacity: {activePin.data.capacity.toLocaleString()}
                  </p>
                  {activePin.data.contact !== "N/A" && (
                    <p className="map-view__iw-detail">
                      📞 {activePin.data.contact}
                    </p>
                  )}
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
      </div>
    </div>
  );
}