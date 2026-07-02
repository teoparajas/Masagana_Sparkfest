// src/App.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import RiskBanner  from "./components/RiskBanner";
import Dashboard   from "./components/Dashboard";
import MapView     from "./components/MapView";
import RoutePanel  from "./components/RoutePanel";
import ReportForm  from "./components/ReportForm";
import FeedList    from "./components/FeedList";
import UserSettings from "./components/UserSettings";
import {
  getWalkingRoute,
  findNearestSafeZone,
  loadRouteCache,
} from "./services/routingService";
import {
  flushQueue,
  getQueueCount,
} from "./services/reportQueueService";
import { useOfflineStatus } from "./hooks/useOfflineStatus";
import safeZones from "./data/safeZones.json";
import "./App.css";
import "./components/UserSettings.css";

const TABS = [
  { id: "map",    label: "🗺 Map"    },
  { id: "report", label: "🚨 Report" },
  { id: "feed",   label: "📋 Feed"   },
  { id: "dash",   label: "📊 Dash"   },
];

export default function App() {
  const isOnline = useOfflineStatus();

  const [activeTab,         setActiveTab]         = useState("map");
  const [userLocation,      setUserLocation]      = useState(null);
  const [selectedSafeZone,  setSelectedSafeZone]  = useState(null);
  const [routeResult,       setRouteResult]       = useState(null);
  const [isCalculating,     setIsCalculating]     = useState(false);
  const [directionsService, setDirectionsService] = useState(null);
  const [queueCount,        setQueueCount]        = useState(0);
  const [userSettingsOpen,  setUserSettingsOpen]  = useState(false);

  // null = first render, not yet initialized
  const wasOnlineRef = useRef(null);

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

  // ── Offline queue flush — only on offline → online transition ─────────────
  useEffect(() => {
    // first render: record state, update badge, don't flush
    if (wasOnlineRef.current === null) {
      wasOnlineRef.current = isOnline;
      getQueueCount().then(setQueueCount);
      return;
    }

    const justReconnected = !wasOnlineRef.current && isOnline;
    wasOnlineRef.current  = isOnline;

    if (justReconnected) {
      console.log("🌐 Back online — flushing queue...");
      flushQueue().then(() => {
        getQueueCount().then(setQueueCount);
      });
    } else {
      getQueueCount().then(setQueueCount);
    }
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
        // pass coords so IndexedDB lookup is specific to this route
        const cached = await loadRouteCache(
          userLocation,
          { lat: selectedSafeZone.lat, lng: selectedSafeZone.lng }
        );
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

  // ── Auto-suggest nearest safe zone ────────────────────────────────────────
  useEffect(() => {
    if (!userLocation || selectedSafeZone) return;
    const nearest = findNearestSafeZone(userLocation, safeZones);
    if (nearest) setSelectedSafeZone(nearest);
  }, [userLocation]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClearRoute = () => {
    setSelectedSafeZone(null);
    setRouteResult(null);
  };

  const handleReportSubmitted = () => {
    getQueueCount().then(setQueueCount);
    setActiveTab("feed");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      <header className="app__header">
        <span className="app__title">FloodWatch MM</span>

        {!isOnline && (
          <span className="app__offline-pill">● Offline</span>
        )}

        {queueCount > 0 && (
          <span
            className="app__queue-badge"
            title={`${queueCount} report(s) waiting to sync`}
          >
            {queueCount} queued
          </span>
        )}
      </header>

      <nav className="app__nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`app__tab ${
              activeTab === tab.id ? "app__tab--active" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <button
          className={`app__tab ${userSettingsOpen ? "app__tab--active" : ""}`}
          onClick={() => setUserSettingsOpen((open) => !open)}
          style={{ minWidth: 94 }}
        >
          ⚙ User
        </button>
      </nav>

      <main className="app__content">

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

        {activeTab === "report" && (
          <ReportForm
            userLocation={userLocation}
            onReportSubmitted={handleReportSubmitted}
          />
        )}

        {activeTab === "feed" && (
          <FeedList />
        )}

        {/* ── Dashboard tab — rain intensity + duration dashboard ── */}
        {activeTab === "dash" && (
          <Dashboard userLocation={userLocation} />
        )}

        {userSettingsOpen && (
          <div className="app__overlay" onClick={() => setUserSettingsOpen(false)}>
            <div className="app__overlay-panel" onClick={(event) => event.stopPropagation()}>
              <UserSettings
                user={{
                  name: "Alex Mercado",
                  email: "alex.mercado@gmail.com",
                  phone: "+63 917 123 4567",
                }}
                onLogout={() => {
                  setUserSettingsOpen(false);
                  setActiveTab("map");
                }}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}