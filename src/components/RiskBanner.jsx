// src/components/RiskBanner.jsx
import { useEffect, useState } from "react";
import { fetchCurrentWeather }          from "../services/weatherService";
import { calculateRisk, isInFloodZone } from "../services/riskEngine";
import {
  saveWeatherCache,
  loadWeatherCache,
  loadMostRecentWeatherCache,
  formatCacheAge,
} from "../services/cacheService";
import { useOfflineStatus }  from "../hooks/useOfflineStatus";
import { useLastSynced }     from "../hooks/useLastSynced";
import OfflineBanner         from "./OfflineBanner";
import floodZones from "../data/floodZones.json";
import "./RiskBanner.css";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function RiskBanner({ userLocation }) {
  const isOnline                   = useOfflineStatus();
  const { lastSyncedAt, markSynced } = useLastSynced();

  const [risk,    setRisk]    = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchAndUpdate = async () => {
    if (!userLocation) return;

    // ── Offline path ──────────────────────────────────────────────────────
    if (!isOnline) {
      const cached = await loadWeatherCache(userLocation.lat, userLocation.lng)
        ?? await loadMostRecentWeatherCache();

      if (cached) {
        setWeather(cached.weather);
        setRisk(cached.risk);
      } else {
        setError(
          "No cached data available. Connect to the internet for your first load."
        );
      }
      setLoading(false);
      return;
    }

    // ── Online path ───────────────────────────────────────────────────────
    setLoading(true);
    setError(null);

    const weatherData = await fetchCurrentWeather(
      userLocation.lat,
      userLocation.lng
    );

    if (!weatherData) {
      const cached = await loadWeatherCache(userLocation.lat, userLocation.lng)
        ?? await loadMostRecentWeatherCache();
      if (cached) {
        setWeather(cached.weather);
        setRisk(cached.risk);
      } else {
        setError("Unable to fetch weather data. Check your connection.");
      }
      setLoading(false);
      return;
    }

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

    await saveWeatherCache(weatherData, riskData);
    await markSynced(); // record successful sync timestamp

    setWeather(weatherData);
    setRisk(riskData);
    setLoading(false);
  };

  useEffect(() => {
    if (!userLocation) return;

    fetchAndUpdate();

    const interval = setInterval(() => {
      if (isOnline) fetchAndUpdate();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userLocation, isOnline]);

  // ── Render states ──────────────────────────────────────────────────────────
  if (!userLocation) {
    return (
      <div className="risk-banner risk-banner--loading">
        <div className="risk-banner__pulse" />
        <span>Acquiring your location...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="risk-banner risk-banner--loading">
        <div className="risk-banner__pulse" />
        <span>Checking flood conditions near you...</span>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <OfflineBanner
          isOnline={isOnline}
          lastSyncedAt={lastSyncedAt}
          onRefresh={fetchAndUpdate}
        />
        <div className="risk-banner risk-banner--error">
          <span className="risk-banner__icon">⚠️</span>
          <span>{error}</span>
        </div>
      </>
    );
  }

  if (!risk) return null;

  return (
    <div
      className={`risk-banner risk-banner--${risk.level}`}
      style={{ borderLeftColor: risk.color }}
    >
      {/* shared offline banner replaces the old inline strip */}
      <OfflineBanner
        isOnline={isOnline}
        lastSyncedAt={lastSyncedAt}
        onRefresh={fetchAndUpdate}
        compact
      />

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