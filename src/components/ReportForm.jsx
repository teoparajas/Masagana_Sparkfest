// src/components/ReportForm.jsx
// Community hazard report submission form.
// Online: submits directly to Firestore via firestoreService.
// Offline: saves to local queue via reportQueueService, syncs on reconnect.

import { useState, useEffect, useRef } from "react";
import { submitReport, runValidationCheck } from "../services/firestoreService";
import { addToQueue }                       from "../services/reportQueueService";
import { useOfflineStatus }                 from "../hooks/useOfflineStatus";
import "./ReportForm.css";
import OfflineBanner from "./OfflineBanner";

const REPORT_TYPES = [
  "Rising floodwater",
  "Impassable road",
  "Stranded residents",
  "Power / utility hazard",
  "Bridge / structure damage",
  "Other",
];

const STATUS = {
  IDLE:    "idle",
  LOADING: "loading",
  SUCCESS: "success",
  QUEUED:  "queued",
  ERROR:   "error",
};

export default function ReportForm({ userLocation, onReportSubmitted }) {
  const isOnline = useOfflineStatus();

  const [location,    setLocation]    = useState("");
  const [type,        setType]        = useState(REPORT_TYPES[0]);
  const [description, setDescription] = useState("");
  const [status,      setStatus]      = useState(STATUS.IDLE);
  const [errorMsg,    setErrorMsg]    = useState("");

  // ref to track success reset timer so we can cancel on unmount
  const successTimerRef = useRef(null);

  // clear any pending timers when component unmounts (e.g. user switches tab)
  // prevents stale state updates on unmounted components
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    if (!location.trim()) {
      setErrorMsg("Please enter a location.");
      return false;
    }
    if (location.trim().length < 5) {
      setErrorMsg("Location is too short — be more specific.");
      return false;
    }
    if (!description.trim()) {
      setErrorMsg("Please describe what you're seeing.");
      return false;
    }
    if (description.trim().length < 10) {
      setErrorMsg("Description is too short — add more detail.");
      return false;
    }
    return true;
  }

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!validate()) return;

    // prevent double-submit
    if (status === STATUS.LOADING) return;

    const reportData = {
      location:    location.trim(),
      type,
      description: description.trim(),
      lat:         userLocation?.lat ?? null,
      lng:         userLocation?.lng ?? null,
    };

    setStatus(STATUS.LOADING);

    // ── Offline path ──────────────────────────────────────────────────────────
    if (!isOnline) {
      addToQueue(reportData);
      setStatus(STATUS.QUEUED);
      resetFormFields();
      if (onReportSubmitted) onReportSubmitted({ ...reportData, status: "pending" });
      return;
    }

    // ── Online path ───────────────────────────────────────────────────────────
    try {
      await submitReport(reportData);

      if (reportData.lat && reportData.lng) {
        await runValidationCheck({
          lat: reportData.lat,
          lng: reportData.lng,
        });
      }

      setStatus(STATUS.SUCCESS);
      resetFormFields();
      if (onReportSubmitted) onReportSubmitted({ ...reportData, status: "pending" });

      // reset success message after 4 seconds
      // stored in ref so it can be cancelled if component unmounts
      successTimerRef.current = setTimeout(() => {
        setStatus(STATUS.IDLE);
      }, 4000);

    } catch (err) {
      console.error("Report submission failed:", err);

      // online submit failed — save to queue as fallback
      addToQueue(reportData);
      setStatus(STATUS.QUEUED);
      resetFormFields();
      if (onReportSubmitted) onReportSubmitted({ ...reportData, status: "pending" });
    }
  }

  function resetFormFields() {
    setLocation("");
    setType(REPORT_TYPES[0]);
    setDescription("");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="report-form">

      {/* offline warning banner */}
        <OfflineBanner
        isOnline={isOnline}
        lastSyncedAt={null}
        message="Offline — your report will be saved locally and sent when you reconnect"
        />

      <div className="report-form__header">
        <h3 className="report-form__title">🚨 Submit a Hazard Report</h3>
        <p className="report-form__subtitle">
          Reports near the same area are automatically verified once 3 or more
          are received.
        </p>
      </div>

      {/* success feedback */}
      {status === STATUS.SUCCESS && (
        <div className="report-form__feedback report-form__feedback--success">
          ✅ Report submitted — it appears in the Community Feed as{" "}
          <b>Pending</b>. Others nearby can verify it.
        </div>
      )}

      {/* queued (offline) feedback */}
      {status === STATUS.QUEUED && (
        <div className="report-form__feedback report-form__feedback--queued">
          💾 Saved locally — will send automatically when you're back online.
        </div>
      )}

      <form onSubmit={handleSubmit} className="report-form__form">

        {/* Location */}
        <div className="report-form__field">
          <label className="report-form__label" htmlFor="rep-location">
            Location <span className="report-form__required">*</span>
          </label>
          <input
            id="rep-location"
            type="text"
            className="report-form__input"
            placeholder="e.g. Marikina, near Tumana Bridge"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={status === STATUS.LOADING}
            maxLength={120}
          />
          {userLocation && !location && (
            <button
              type="button"
              className="report-form__gps-hint"
              onClick={() =>
                setLocation(
                  `Near ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                )
              }
            >
              📍 Use my GPS coordinates
            </button>
          )}
        </div>

        {/* Report type */}
        <div className="report-form__field">
          <label className="report-form__label" htmlFor="rep-type">
            What are you seeing?{" "}
            <span className="report-form__required">*</span>
          </label>
          <select
            id="rep-type"
            className="report-form__select"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={status === STATUS.LOADING}
          >
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="report-form__field">
          <label className="report-form__label" htmlFor="rep-desc">
            Description <span className="report-form__required">*</span>
          </label>
          <textarea
            id="rep-desc"
            className="report-form__textarea"
            placeholder="e.g. Water is knee-deep along the main road, rising slowly. Tricycles can't pass."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={status === STATUS.LOADING}
            maxLength={500}
            rows={4}
          />
          <span className="report-form__charcount">
            {description.length}/500
          </span>
        </div>

        {/* Photo placeholder */}
        <div className="report-form__field">
          <label className="report-form__label">
            Photo{" "}
            <span className="report-form__optional">
              (optional — coming soon)
            </span>
          </label>
          <div className="report-form__photo-placeholder">
            📷 Photo upload — future feature
          </div>
        </div>

        {/* Validation error */}
        {errorMsg && (
          <div className="report-form__error">⚠️ {errorMsg}</div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className={`report-form__submit ${
            !isOnline ? "report-form__submit--offline" : ""
          }`}
          disabled={status === STATUS.LOADING}
        >
          {status === STATUS.LOADING
            ? "Submitting..."
            : isOnline
            ? "Submit Report"
            : "Save Report (offline)"}
        </button>

      </form>
    </div>
  );
}