// src/components/RiskBanner.jsx
// Fetches live weather for the user's location, calculates flood risk,
// and renders a color-coded alert banner.
// Falls back to cached data when offline.

import { useEffect, useState } from "react";
import { fetchCurrentWeather, TARGET_AREAS } from "../services/weatherService";
import { calculateRisk, isInFloodZone }       from "../services/riskEngine";
import { saveWeatherCache, loadWeatherCache, formatCacheAge } from "../services/cacheService";
import { useOfflineStatus }                   from "../hooks/useOfflineStatus";
import floodZones from "../data/floodZones.json";
import "./RiskBanner.css";

// How often to refresh weather data when online (5 minutes)
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export default function RiskBanner() {
  const isOnline = useOfflineStatus();

  const [risk,        setRisk]        = useState(null);   // output of calculateRisk()
  const [weather,     setWeather]     = useState(null);   // raw Open-Meteo data
  const [cacheAge,    setCacheAge]    = useState(null);   // timestamp string
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [userCoords,  setUserCoords]  = useState(null);

  // ── Step 1: get user's GPS location ────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      // GPS not available — fall back to Marikina as default
      setUserCoords({ lat: 14.6507, lng: 121.1029 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.warn("GPS unavailable:", err.message);
        // fallback to center of Metro Manila
        setUserCoords({ lat: 14.5995, lng: 120.9842 });
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // ── Step 2: fetch weather once we have coords ───────────────────────────────
  useEffect(() => {
    if (!userCoords) return;

    const fetchAndUpdate = async () => {
      // if offline, load from cache immediately and skip the fetch
      if (!isOnline) {
        const cached = loadWeatherCache();
        if (cached) {
          setWeather(cached.weather);
          setRisk(cached.risk);
          setCacheAge(formatCacheAge(cached.timestamp));
        } else {
          setError("No cached data available. Connect to the internet for your first load.");
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const weatherData = await fetchCurrentWeather(userCoords.lat, userCoords.lng);

      if (!weatherData) {
        // fetch failed even though we think we're online — use cache
        const cached = loadWeatherCache();
        if (cached) {
          setWeather(cached.weather);
          setRisk(cached.risk);
          setCacheAge(formatCacheAge(cached.timestamp));
        } else {
          setError("Unable to fetch weather data. Check your connection.");
        }
        setLoading(false);
        return;
      }

      // calculate risk from fresh data
      const inFloodZone = isInFloodZone(userCoords.lat, userCoords.lng, floodZones);
      const riskData    = calculateRisk(
        weatherData.rainfallMm,
        inFloodZone,
        weatherData.weatherCode,
        weatherData.rainfallNext3h
      );

      // save to cache for offline use
      saveWeatherCache(weatherData, riskData);

      setWeather(weatherData);
      setRisk(riskData);
      setCacheAge(null); // null = data is live, not cached
      setLoading(false);
    };

    fetchAndUpdate();

    // auto-refresh every 5 minutes while online
    const interval = setInterval(() => {
      if (isOnline) fetchAndUpdate();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userCoords, isOnline]);

  // ── Render states ───────────────────────────────────────────────────────────

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
      <div className="risk-banner risk-banner--error">
        <span className="risk-banner__icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  if (!risk) return null;

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

      {/* live refresh timestamp */}
      {isOnline && weather && (
        <div className="risk-banner__footer">
          Live data · updated just now
        </div>
      )}
    </div>
  );
}