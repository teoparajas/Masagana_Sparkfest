// src/App.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import RiskBanner  from "./components/RiskBanner";
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
  clearEntireQueue,
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

  // tracks previous online state so we only flush on offline → online transition
  // null = first render, not yet initialized
  const wasOnlineRef = useRef(null);

  // ── GPS — single source for the whole app ─────────────────────────────────
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

  // ── Offline queue flush — only triggers on offline → online transition ─────
  useEffect(() => {
    // first render: record initial state and update badge, don't flush
    if (wasOnlineRef.current === null) {
      wasOnlineRef.current = isOnline;
      setQueueCount(getQueueCount());
      return;
    }

    const justReconnected = !wasOnlineRef.current && isOnline;
    wasOnlineRef.current  = isOnline;

    if (justReconnected) {
      console.log("🌐 Back online — flushing queue...");
      flushQueue().then(() => {
        setQueueCount(getQueueCount());
      });
    } else {
      // just went offline or some other state change — just update badge
      setQueueCount(getQueueCount());
    }
  }, [isOnline]);

  // ── Map ready — receive DirectionsService instance from MapView ───────────
  const handleMapReady = useCallback((service) => {
    setDirectionsService(service);
  }, []);

  // ── Route calculation — runs when safe zone selection changes ─────────────
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

  // ── Auto-suggest nearest safe zone once GPS resolves ─────────────────────
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
    // update queue badge immediately
    setQueueCount(getQueueCount());
    // switch to feed immediately so user sees their report land
    setActiveTab("feed");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* app header */}
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
        <button
          className={`app__tab ${userSettingsOpen ? "app__tab--active" : ""}`}
          onClick={() => setUserSettingsOpen((open) => !open)}
          style={{ minWidth: 94 }}
        >
          ⚙ User
        </button>
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

        {/* ── Feed tab ── */}
        {activeTab === "feed" && (
          <FeedList />
        )}

        {/* ── Dashboard tab — placeholder until task 3.4 ── */}
        {activeTab === "dash" && (
          <div style={{
            padding:    "24px 16px",
            textAlign:  "center",
            color:      "#888",
            fontFamily: "Arial",
            fontSize:   "13px",
          }}>
            📊 Responder Dashboard — built in task 3.4
          </div>
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