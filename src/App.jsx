// src/App.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import RiskBanner  from "./components/RiskBanner";
import Dashboard   from "./components/Dashboard";
import MapView     from "./components/MapView";
import RoutePanel  from "./components/RoutePanel";
import ReportForm  from "./components/ReportForm";
import FeedList    from "./components/FeedList";
import UserSettings from "./components/UserSettings";
import AuthPanel from "./components/AuthPanel";
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
import { auth } from "./services/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  const [userLocation,      setUserLocation]      = useState(() =>
    navigator.geolocation
      ? null
      : { lat: 14.5995, lng: 120.9842 }
  );
  const [selectedSafeZone,  setSelectedSafeZone]  = useState(null);
  const [routeResult,       setRouteResult]       = useState(null);
  const [isCalculating,     setIsCalculating]     = useState(false);
  const [directionsService, setDirectionsService] = useState(null);
  const [queueCount,        setQueueCount]        = useState(0);
  const [userSettingsOpen,  setUserSettingsOpen]  = useState(false);
  const [authUser,          setAuthUser]          = useState(null);
  const [authPanelOpen,     setAuthPanelOpen]     = useState(false);
  const [authMode,          setAuthMode]          = useState("signin");

  // null = first render, not yet initialized
  const wasOnlineRef = useRef(null);

  // ── GPS ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user ? {
        uid: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
      } : null);
    });

    return unsubscribe;
  }, []);

  // ── Offline queue flush — only on offline → online transition ─────────────
  useEffect(() => {
    // first render: record state and refresh badge
    if (wasOnlineRef.current === null) {
      wasOnlineRef.current = isOnline;
      getQueueCount().then(setQueueCount);

      if (isOnline) {
        console.log("🌐 Online on startup — flushing queued reports...");
        flushQueue().then(() => {
          getQueueCount().then(setQueueCount);
        });
      }
      return;
    }

    const justReconnected = !wasOnlineRef.current && isOnline;
    wasOnlineRef.current  = isOnline;

    if (justReconnected) {
      console.log("🌐 Back online — flushing queued reports...");
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
    if (!nearest) return;

    const handle = requestAnimationFrame(() => {
      setSelectedSafeZone(nearest);
    });

    return () => cancelAnimationFrame(handle);
  }, [userLocation, selectedSafeZone]);

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
        <div>
          <span className="app__title">FloodWatch MM</span>
          <div className="app__subtitle">
            {authUser
              ? `Signed in as ${authUser.displayName || authUser.email}`
              : "Guest mode — limited personalization, no saved profile data."}
          </div>
        </div>

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
          onClick={() => {
            setUserSettingsOpen((open) => !open);
            setAuthPanelOpen(false);
          }}
          style={{ minWidth: 94 }}
        >
          ⚙ User
        </button>
        <button
          className={`app__tab ${authPanelOpen ? "app__tab--active" : ""}`}
          onClick={() => {
            setAuthPanelOpen((open) => !open);
            setUserSettingsOpen(false);
          }}
          style={{ minWidth: 94 }}
        >
          🔑 Login
        </button>
      </nav>

      <main className="app__content">

        {activeTab === "map" && (
          <>
            <RiskBanner userLocation={userLocation} />
            <MapView
              userLocation={userLocation}
              routePoints={routeResult?.points ?? null}
              isRouteFromCache={routeResult?.fromCache ?? false}
              routeCachedAt={routeResult?.cachedAt ?? null}
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
                user={authUser ?? {
                  name: "Guest User",
                  email: "Guest mode",
                  phone: "—",
                }}
                isGuest={!authUser}
                onLogout={async () => {
                  if (authUser) {
                    await signOut(auth);
                  }
                  setUserSettingsOpen(false);
                  setActiveTab("map");
                }}
                onLogin={() => {
                  setUserSettingsOpen(false);
                  setAuthPanelOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {authPanelOpen && (
          <div className="app__overlay" onClick={() => setAuthPanelOpen(false)}>
            <div className="app__overlay-panel" onClick={(event) => event.stopPropagation()}>
              <AuthPanel
                mode={authMode}
                onModeChange={setAuthMode}
                onClose={() => setAuthPanelOpen(false)}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}