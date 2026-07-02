// src/components/FeedList.jsx
// Real-time community hazard report feed.
// Subscribes to Firestore via onSnapshot — updates live without refresh.
// Shows Pending / Verified badges, report type, location, and relative time.
// Handles offline state by showing last-seen reports from the snapshot cache.

import { useEffect, useState } from "react";
import { subscribeToReports, formatReportTime } from "../services/firestoreService";
import { getQueue }                              from "../services/reportQueueService";
import { useOfflineStatus }                      from "../hooks/useOfflineStatus";
import "./FeedList.css";

// icon per report type — purely visual, no logic
const TYPE_ICONS = {
  "Rising floodwater":      "🌊",
  "Impassable road":        "🚧",
  "Stranded residents":     "🆘",
  "Power / utility hazard": "⚡",
  "Bridge / structure damage": "🌉",
  "Other":                  "📌",
};

export default function FeedList() {
  const isOnline = useOfflineStatus();

  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [filter,    setFilter]    = useState("all"); // "all" | "verified" | "pending"

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

    // cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // ── Merge queued offline reports into the feed ────────────────────────────
  // so users can see their own pending offline reports in the feed
  // even before they sync to Firestore
  const queuedReports = getQueue().map((r) => ({
    id:          r.localId,
    location:    r.location,
    type:        r.type,
    description: r.description,
    lat:         r.lat,
    lng:         r.lng,
    status:      "pending",
    createdAt:   new Date(r.queuedAt),
    isQueued:    true, // flag to show "not yet synced" indicator
  }));

  // combine: queued first (most urgent), then live reports
  const allReports = [...queuedReports, ...reports];

  // apply filter
  const filtered = allReports.filter((r) => {
    if (filter === "all")      return true;
    if (filter === "verified") return r.status === "verified";
    if (filter === "pending")  return r.status === "pending";
    return true;
  });

  // ── Counts for filter badges ───────────────────────────────────────────────
  const verifiedCount = allReports.filter((r) => r.status === "verified").length;
  const pendingCount  = allReports.filter((r) => r.status === "pending").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="feed">

      {/* offline notice */}
      {!isOnline && (
        <div className="feed__offline-bar">
          📵 Offline — showing last loaded reports. New reports save locally.
        </div>
      )}

      {/* header + stats */}
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

      {/* filter tabs */}
      <div className="feed__filters">
        {[
          { key: "all",      label: `All (${allReports.length})`  },
          { key: "verified", label: `Verified (${verifiedCount})` },
          { key: "pending",  label: `Pending (${pendingCount})`   },
        ].map((f) => (
          <button
            key={f.key}
            className={`feed__filter-btn ${filter === f.key ? "feed__filter-btn--active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* loading state */}
      {loading && (
        <div className="feed__loading">
          <div className="feed__spinner" />
          Loading reports...
        </div>
      )}

      {/* error state */}
      {error && !loading && (
        <div className="feed__error">⚠️ {error}</div>
      )}

      {/* empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="feed__empty">
          {filter === "all"
            ? "No reports yet. Be the first to report a hazard."
            : `No ${filter} reports right now.`}
        </div>
      )}

      {/* report cards */}
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

  const icon = TYPE_ICONS[report.type] ?? "📌";
  const timeStr = formatReportTime(report.createdAt);

  return (
    <div
      className={`feed-card feed-card--${report.status}`}
      onClick={() => setExpanded((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
    >
      {/* top row */}
      <div className="feed-card__top">
        <span className="feed-card__icon">{icon}</span>

        <div className="feed-card__main">
          <span className="feed-card__location">{report.location}</span>
          <span className="feed-card__type">{report.type}</span>
        </div>

        <div className="feed-card__right">
          {/* status badge */}
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

      {/* expanded description */}
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

      {/* expand hint */}
      <div className="feed-card__expand-hint">
        {expanded ? "▲ less" : "▼ more"}
      </div>
    </div>
  );
}