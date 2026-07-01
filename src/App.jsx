// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import RiskBanner  from "./components/RiskBanner";
import MapView     from "./components/MapView";
import RoutePanel  from "./components/RoutePanel";
import {
  getWalkingRoute,
  findNearestSafeZone,
  loadRouteCache,
} from "./services/routingService";
import { useOfflineStatus } from "./hooks/useOfflineStatus";
import safeZones from "./data/safeZones.json";
import "./App.css";

export default function App() {
  const isOnline = useOfflineStatus();

  const [userLocation,       setUserLocation]       = useState(null);
  const [selectedSafeZone,   setSelectedSafeZone]   = useState(null);
  const [routeResult,        setRouteResult]        = useState(null);
  const [isCalculating,      setIsCalculating]      = useState(false);
  const [directionsService,  setDirectionsService]  = useState(null);

  // ── GPS — single source for whole app ─────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation({ lat: 14.5995, lng: 120.9842 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()    => setUserLocation({ lat: 14.5995, lng: 120.9842 }),
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // ── Receive DirectionsService instance from MapView once map loads ─────────
  const handleMapReady = useCallback((service) => {
    setDirectionsService(service);
  }, []);

  // ── Calculate route whenever a safe zone is selected ──────────────────────
  useEffect(() => {
    if (!selectedSafeZone || !userLocation) return;

    const calculate = async () => {
      setIsCalculating(true);
      setRouteResult(null);

      if (!isOnline) {
        // offline — load cached route immediately
        const cached = loadRouteCache();
        setRouteResult(cached);
        setIsCalculating(false);
        return;
      }

      const result = await getWalkingRoute(
        userLocation,
        { lat: selectedSafeZone.lat, lng: selectedSafeZone.lng },
        directionsService
      );

      setRouteResult(result);
      setIsCalculating(false);
    };

    calculate();
  }, [selectedSafeZone, userLocation, isOnline, directionsService]);

  // ── Auto-suggest nearest safe zone once we have user location ─────────────
  // (suggests but doesn't force — user can override by tapping a different pin)
  useEffect(() => {
    if (!userLocation || selectedSafeZone) return;
    const nearest = findNearestSafeZone(userLocation, safeZones);
    if (nearest) setSelectedSafeZone(nearest);
  }, [userLocation]);

  // ── Clear route ────────────────────────────────────────────────────────────
  const handleClearRoute = () => {
    setSelectedSafeZone(null);
    setRouteResult(null);
  };

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "16px" }}>
      <h2 style={{ fontFamily: "Arial", color: "#1F3A5F", marginBottom: "12px" }}>
        FloodWatch MM
      </h2>

      <RiskBanner userLocation={userLocation} />

      <MapView
        userLocation={userLocation}
        routePoints={routeResult?.points ?? null}
        onSafeZoneSelect={setSelectedSafeZone}
        onMapReady={handleMapReady}
      />

      <RoutePanel
        safeZone={selectedSafeZone}
        routeResult={routeResult}
        isCalculating={isCalculating}
        onClear={handleClearRoute}
      />
    </div>
  );
}