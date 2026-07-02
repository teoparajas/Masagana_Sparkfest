// src/components/RiskBanner.jsx
// Fetches live weather for the user's location, calculates flood risk,
// and renders a color-coded alert banner.
// Falls back to IndexedDB cached data when offline.
// userLocation is passed down from App.jsx — no GPS call here.

import { useEffect, useState } from "react";
import { fetchCurrentWeather }          from "../services/weatherService";
import { calculateRisk, isInFloodZone } from "../services/riskEngine";
import {
  saveWeatherCache,
  loadWeatherCache,
  loadMostRecentWeatherCache,
  formatCacheAge,
} from "../services/cacheService";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import floodZones from "../data/floodZones.json";
import "./RiskBanner.css";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function RiskBanner({ userLocation }) {
  const isOnline = useOfflineStatus();

  const [risk,     setRisk]     = useState(null);
  const [weather,  setWeather]  = useState(null);
  const [cacheAge, setCacheAge] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!userLocation) return;

    const fetchAndUpdate = async () => {
      // ── Offline path ────────────────────────────────────────────────────────
      if (!isOnline) {
        // try exact location cache first, fall back to most recent
        const cached = await loadWeatherCache(userLocation.lat, userLocation.lng)
          ?? await loadMostRecentWeatherCache();

        if (cached) {
          setWeather(cached.weather);
          setRisk(cached.risk);
          setCacheAge(formatCacheAge(cached.fetchedAt));
        } else {
          setError(
            "No cached data available. Connect to the internet for your first load."
          );
        }
        setLoading(false);
        return;
      }

      // ── Online path ──────────────────────────────────────────────────────────
      setLoading(true);
      setError(null);

      const weatherData = await fetchCurrentWeather(
        userLocation.lat,
        userLocation.lng
      );

      if (!weatherData) {
        // fetch failed even though navigator.onLine said true —
        // intermittent connection, fall back to IndexedDB cache
        const cached = await loadWeatherCache(userLocation.lat, userLocation.lng)
          ?? await loadMostRecentWeatherCache();

        if (cached) {
          setWeather(cached.weather);
          setRisk(cached.risk);
          setCacheAge(formatCacheAge(cached.fetchedAt));
        } else {
          setError("Unable to fetch weather data. Check your connection.");
        }
        setLoading(false);
        return;
      }

      // calculate risk from fresh live data
      const inFloodZone = isInFloodZone(
        userLocation.lat,
        userLocation.lng,
        floodZones
      );

      const riskData = calculateRisk(
        weatherData.rainfallMm,
        inFloodZone,
        weatherData.weatherCode,
        weatherData.rainfallNext3h
      );

      // persist to IndexedDB cache for offline fallback
      await saveWeatherCache(weatherData, riskData);

      setWeather(weatherData);
      setRisk(riskData);
      setCacheAge(null);
      setLoading(false);
    };

    fetchAndUpdate();

    const interval = setInterval(() => {
      if (isOnline) fetchAndUpdate();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userLocation, isOnline]);

  // ── Render: waiting for GPS ────────────────────────────────────────────────
  if (!userLocation) {
    return (
      <div className="risk-banner risk-banner--loading">
        <div className="risk-banner__pulse" />
        <span>Acquiring your location...</span>
      </div>
    );
  }

  // ── Render: fetching weather ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="risk-banner risk-banner--loading">
        <div className="risk-banner__pulse" />
        <span>Checking flood conditions near you...</span>
      </div>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="risk-banner risk-banner--error">
        <span className="risk-banner__icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  if (!risk) return null;

  // ── Render: normal banner ──────────────────────────────────────────────────
  return (
    <div
      className={`risk-banner risk-banner--${risk.level}`}
      style={{ borderLeftColor: risk.color }}
    >
      {/* offline indicator strip */}
      {!isOnline && (
        <div className="risk-banner__offline-strip">
          📵 Offline — showing cached data · last updated {cacheAge}
        </div>
      )}

      <div className="risk-banner__content">
        <div className="risk-banner__left">
          <span className="risk-banner__level" style={{ color: risk.color }}>
            {risk.level === "high"     && "🔴"}
            {risk.level === "moderate" && "🟡"}
            {risk.level === "low"      && "🟢"}
            {" "}{risk.label}
          </span>
          <span className="risk-banner__advice">{risk.advice}</span>
        </div>

        <div className="risk-banner__right">
          {weather && (
            <>
              <span className="risk-banner__stat">
                🌧 {weather.rainfallMm} mm/hr
              </span>
              <span className="risk-banner__stat">
                🌡 {weather.tempC}°C
              </span>
              <span className="risk-banner__desc">
                {weather.description}
              </span>
            </>
          )}
        </div>
      </div>

      {isOnline && weather && (
        <div className="risk-banner__footer">
          Live data · updated just now
        </div>
      )}
    </div>
  );
}