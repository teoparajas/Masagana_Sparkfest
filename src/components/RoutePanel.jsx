// src/components/RoutePanel.jsx
// Displays route summary after a safe zone is selected.
// Shows distance, estimated walk time, which API provided the route,
// and a warning if showing a cached route while offline.

import "./RoutePanel.css";

export default function RoutePanel({
  safeZone,       // the selected safe zone object
  routeResult,    // RouteResult from routingService, or null
  isCalculating,  // bool — show loading state while route is being fetched
  onClear,        // callback — clears the selected route
}) {
  if (!safeZone) return null;

  return (
    <div className="route-panel">
      <div className="route-panel__header">
        <span className="route-panel__title">
          🧭 Route to <b>{safeZone.name}</b>
        </span>
        <button className="route-panel__clear" onClick={onClear}>
          ✕
        </button>
      </div>

      {/* cached route warning */}
      {routeResult?.fromCache && (
        <div className="route-panel__cache-warning">
          📵 Showing last known route — recalculates when back online
        </div>
      )}

      {/* loading state */}
      {isCalculating && (
        <div className="route-panel__loading">
          <div className="route-panel__spinner" />
          Calculating walking route...
        </div>
      )}

      {/* route details */}
      {!isCalculating && routeResult && (
        <div className="route-panel__details">
          <div className="route-panel__stat">
            <span className="route-panel__stat-icon">📍</span>
            <span className="route-panel__stat-value">
              {routeResult.distanceText}
            </span>
            <span className="route-panel__stat-label">distance</span>
          </div>

          <div className="route-panel__divider" />

          <div className="route-panel__stat">
            <span className="route-panel__stat-icon">🚶</span>
            <span className="route-panel__stat-value">
              {routeResult.durationText}
            </span>
            <span className="route-panel__stat-label">walking</span>
          </div>

          <div className="route-panel__divider" />

          <div className="route-panel__stat">
            <span className="route-panel__stat-icon">👥</span>
            <span className="route-panel__stat-value">
              {safeZone.capacity.toLocaleString()}
            </span>
            <span className="route-panel__stat-label">capacity</span>
          </div>
        </div>
      )}

      {/* no route found */}
      {!isCalculating && routeResult && (
        <div className="route-panel__details">
            <div className="route-panel__stat">
                <span className="route-panel__stat-icon">📍</span>
                <span className="route-panel__stat-value">
                    {routeResult.distanceText ?? "—"}
                </span>
                <span className="route-panel__stat-label">distance</span>
            </div>

            <div className="route-panel__divider" />

            <div className="route-panel__stat">
                <span className="route-panel__stat-icon">🚶</span>
                <span className="route-panel__stat-value">
                    {routeResult.durationText ?? "—"}
                </span>
                <span className="route-panel__stat-label">walking</span>
            </div>

            <div className="route-panel__divider" />

            <div className="route-panel__stat">
                <span className="route-panel__stat-icon">👥</span>
                <span className="route-panel__stat-value">
                    {/* safely handle missing capacity */}
                    {safeZone.capacity != null
                      ? safeZone.capacity.toLocaleString()
                      : "N/A"}
                </span>
                <span className="route-panel__stat-label">capacity</span>
            </div>
        </div>
        )}

      {/* source attribution */}
      {routeResult && !routeResult.fromCache && (
        <div className="route-panel__source">
          via {routeResult.source === "google" ? "Google Maps" : "OpenStreetMap / OSRM"}
        </div>
      )}
    </div>
  );
}