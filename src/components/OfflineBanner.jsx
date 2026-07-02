// src/components/OfflineBanner.jsx
// Shared offline state indicator — used across all screens.
// Shows connectivity status, last sync time, and a manual refresh option.
// Import this instead of writing custom offline UI in each component.

import { useState } from "react";
import "./OfflineBanner.css";

export default function OfflineBanner({
  isOnline,           // bool — current connectivity state
  lastSyncedAt,       // number | null — Date.now() timestamp of last successful sync
  onRefresh,          // function | null — called when user taps refresh
  message,            // string | null — override the default message
  compact,            // bool — smaller version for use inside components
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (isOnline) return null; // only renders when offline

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const defaultMessage = lastSyncedAt
    ? `Offline — showing data from ${formatAge(lastSyncedAt)}`
    : "Offline — no cached data loaded yet";

  return (
    <div className={`offline-banner ${compact ? "offline-banner--compact" : ""}`}>
      <span className="offline-banner__icon">📵</span>

      <span className="offline-banner__message">
        {message ?? defaultMessage}
      </span>

      {onRefresh && (
        <button
          className="offline-banner__refresh"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? "..." : "↻"}
        </button>
      )}
    </div>
  );
}

// relative time formatter — kept local to this component
function formatAge(timestamp) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1)   return "just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60)  return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hr ago" : `${hours} hrs ago`;
}