// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import RiskBanner   from "./components/RiskBanner";
import MapView      from "./components/MapView";
import RoutePanel   from "./components/RoutePanel";
import ReportForm   from "./components/ReportForm";
import {
  getWalkingRoute,
  findNearestSafeZone,
  loadRouteCache,
} from "./services/routingService";
import { flushQueue, getQueueCount } from "./services/reportQueueService";
import { useOfflineStatus }           from "./hooks/useOfflineStatus";
import safeZones from "./data/safeZones.json";
import "./App.css";

const TABS = [
  { id: "map",    label: "🗺 Map"     },
  { id: "report", label: "🚨 Report"  },
  { id: "feed",   label: "📋 Feed"    },  // built in task 3.2
  { id: "dash",   label: "📊 Dash"   },  // built in task 3.4
];

export default function App() {
  const isOnline = useOfflineStatus();

  const [activeTab,          setActiveTab]          = useState("map");
  const [userLocation,       setUserLocation]       = useState(null);
  const [selectedSafeZone,   setSelectedSafeZone]   = useState(null);
  const [routeResult,        setRouteResult]        = useState(null);
  const [isCalculating,      setIsCalculating]      = useState(false);
  const [directionsService,  setDirectionsService]  = useState(null);
  const [queueCount,         setQueueCount]         = useState(0);

  // ── GPS ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation({ lat: 14.5995, lng: 120.9842 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
      () => setUserLocation({ lat: 14.5995, lng: 120.9842 }),
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // ── Offline queue flush on reconnect ───────────────────────────────────────
  useEffect(() => {
    const sync = async () => {
      if (isOnline) await flushQueue();
      setQueueCount(getQueueCount());
    };
    sync();
  }, [isOnline]);

  // ── Map ready ─────────────────────────────────────────────────────────────
  const handleMapReady = useCallback((service) => {
    setDirectionsService(service);
  }, []);

  // ── Route calculation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSafeZone || !userLocation) return;

    const calculate = async () => {
      setIsCalculating(true);
      setRouteResult(null);

      if (!isOnline) {
        setRouteResult(loadRouteCache());
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

  // ── Auto-suggest nearest safe zone ───────────────────────────────────────
  useEffect(() => {
    if (!userLocation || selectedSafeZone) return;
    const nearest = findNearestSafeZone(userLocation, safeZones);
    if (nearest) setSelectedSafeZone(nearest);
  }, [userLocation]);

  const handleClearRoute = () => {
    setSelectedSafeZone(null);
    setRouteResult(null);
  };

  const handleReportSubmitted = () => {
    setQueueCount(getQueueCount());
    // switch to feed after submitting so user sees their report appear
    setTimeout(() => setActiveTab("feed"), 1000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* app header */}
      <header className="app__header">
        <span className="app__title">FloodWatch MM</span>
        {/* offline pill */}
        {!isOnline && (
          <span className="app__offline-pill">● Offline</span>
        )}
        {/* queued reports badge */}
        {queueCount > 0 && (
          <span className="app__queue-badge" title="Reports pending sync">
            {queueCount} queued
          </span>
        )}
      </header>

      {/* tab navigation */}
      <nav className="app__nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`app__tab ${activeTab === tab.id ? "app__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* tab content */}
      <main className="app__content">

        {/* ── Map tab ── */}
        {activeTab === "map" && (
          <>
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
          </>
        )}

        {/* ── Report tab ── */}
        {activeTab === "report" && (
          <ReportForm
            userLocation={userLocation}
            onReportSubmitted={handleReportSubmitted}
          />
        )}

        {/* ── Feed tab — placeholder until 3.2 ── */}
        {activeTab === "feed" && (
          <div style={{
            padding: "24px 16px",
            textAlign: "center",
            color: "#888",
            fontFamily: "Arial",
            fontSize: "13px"
          }}>
            📋 Community Feed — built in task 3.2
          </div>
        )}

        {/* ── Dashboard tab — placeholder until 3.4 ── */}
        {activeTab === "dash" && (
          <div style={{
            padding: "24px 16px",
            textAlign: "center",
            color: "#888",
            fontFamily: "Arial",
            fontSize: "13px"
          }}>
            📊 Responder Dashboard — built in task 3.4
          </div>
        )}

      </main>
    </div>
  );
}