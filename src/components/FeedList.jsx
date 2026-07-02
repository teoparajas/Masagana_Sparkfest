// src/components/FeedList.jsx
// Real-time community hazard report feed.
// Subscribes to Firestore via onSnapshot — updates live without refresh.
// Merges locally queued offline reports (from IndexedDB) into the feed.

import OfflineBanner from "./OfflineBanner";
import { useEffect, useState } from "react";
import {
  subscribeToReports,
  formatReportTime,
} from "../services/firestoreService";
import { getQueue }         from "../services/reportQueueService";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import "./FeedList.css";

const TYPE_ICONS = {
  "Rising floodwater":         "🌊",
  "Impassable road":           "🚧",
  "Stranded residents":        "🆘",
  "Power / utility hazard":    "⚡",
  "Bridge / structure damage": "🌉",
  "Other":                     "📌",
};

export default function FeedList() {
  const isOnline = useOfflineStatus();

  const [reports,       setReports]       = useState([]);
  const [queuedReports, setQueuedReports] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [filter,        setFilter]        = useState("all");

  // ── Subscribe to Firestore real-time feed ─────────────────────────────────
  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeToReports(
      (liveReports) => {
        setReports(liveReports);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Feed subscription error:", err);
        setError("Unable to load reports. Check your connection.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ── Load queued offline reports from IndexedDB ────────────────────────────
  // runs once on mount — queued items update via the queue badge in App.jsx
  useEffect(() => {
    getQueue().then((queue) => {
      setQueuedReports(
        queue.map((r) => ({
          id:          r.localId,
          location:    r.location,
          type:        r.type,
          description: r.description,
          lat:         r.lat,
          lng:         r.lng,
          status:      "pending",
          createdAt:   new Date(r.queuedAt),
          isQueued:    true,
        }))
      );
    });
  }, []);

  // ── Combine queued + live reports ─────────────────────────────────────────
  // queued reports appear first — they're the most recent from this device
  const allReports = [...queuedReports, ...reports];

  const filtered = allReports.filter((r) => {
    if (filter === "all")      return true;
    if (filter === "verified") return r.status === "verified";
    if (filter === "pending")  return r.status === "pending";
    return true;
  });

  const verifiedCount = allReports.filter((r) => r.status === "verified").length;
  const pendingCount  = allReports.filter((r) => r.status === "pending").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="feed">

        <OfflineBanner
        isOnline={isOnline}
        lastSyncedAt={null}
        message="Offline — showing last loaded reports. New reports save locally."
        compact
        />

      <div className="feed__header">
        <h3 className="feed__title">📋 Community Reports</h3>
        <div className="feed__stats">
          <span className="feed__stat feed__stat--verified">
            ✅ {verifiedCount} verified
          </span>
          <span className="feed__stat feed__stat--pending">
            ⏳ {pendingCount} pending
          </span>
        </div>
      </div>

      <div className="feed__filters">
        {[
          { key: "all",      label: `All (${allReports.length})`  },
          { key: "verified", label: `Verified (${verifiedCount})` },
          { key: "pending",  label: `Pending (${pendingCount})`   },
        ].map((f) => (
          <button
            key={f.key}
            className={`feed__filter-btn ${
              filter === f.key ? "feed__filter-btn--active" : ""
            }`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="feed__loading">
          <div className="feed__spinner" />
          Loading reports...
        </div>
      )}

      {error && !loading && (
        <div className="feed__error">⚠️ {error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="feed__empty">
          {filter === "all"
            ? "No reports yet. Be the first to report a hazard."
            : `No ${filter} reports right now.`}
        </div>
      )}

      <div className="feed__list">
        {filtered.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>

    </div>
  );
}

// ── ReportCard sub-component ──────────────────────────────────────────────────

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false);

  const icon    = TYPE_ICONS[report.type] ?? "📌";
  const timeStr = formatReportTime(report.createdAt);

  return (
    <div
      className={`feed-card feed-card--${report.status}`}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
    >
      <div className="feed-card__top">
        <span className="feed-card__icon">{icon}</span>

        <div className="feed-card__main">
          <span className="feed-card__location">{report.location}</span>
          <span className="feed-card__type">{report.type}</span>
        </div>

        <div className="feed-card__right">
          {report.isQueued ? (
            <span className="feed-card__badge feed-card__badge--queued">
              💾 Queued
            </span>
          ) : report.status === "verified" ? (
            <span className="feed-card__badge feed-card__badge--verified">
              ✅ Verified
            </span>
          ) : (
            <span className="feed-card__badge feed-card__badge--pending">
              ⏳ Pending
            </span>
          )}
          <span className="feed-card__time">{timeStr}</span>
        </div>
      </div>

      {expanded && (
        <div className="feed-card__desc">
          {report.description}
          {report.lat && report.lng && (
            <span className="feed-card__coords">
              📍 {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
            </span>
          )}
        </div>
      )}

      <div className="feed-card__expand-hint">
        {expanded ? "▲ less" : "▼ more"}
      </div>
    </div>
  );
}