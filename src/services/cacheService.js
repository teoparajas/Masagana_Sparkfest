// src/services/cacheService.js
// Simple localStorage wrapper for caching last-known weather and risk data.
// localStorage works synchronously and survives page refreshes —
// good enough for a hackathon MVP. Day 4 upgrades this to IndexedDB.

const KEYS = {
  WEATHER:    "fw_cached_weather",
  RISK:       "fw_cached_risk",
  TIMESTAMP:  "fw_cached_timestamp",
};

export function saveWeatherCache(weatherData, riskData) {
  try {
    localStorage.setItem(KEYS.WEATHER,   JSON.stringify(weatherData));
    localStorage.setItem(KEYS.RISK,      JSON.stringify(riskData));
    localStorage.setItem(KEYS.TIMESTAMP, Date.now().toString());
  } catch (e) {
    console.warn("Cache write failed:", e);
  }
}

export function loadWeatherCache() {
  try {
    const weather   = localStorage.getItem(KEYS.WEATHER);
    const risk      = localStorage.getItem(KEYS.RISK);
    const timestamp = localStorage.getItem(KEYS.TIMESTAMP);

    if (!weather || !risk) return null;

    return {
      weather:   JSON.parse(weather),
      risk:      JSON.parse(risk),
      timestamp: parseInt(timestamp, 10),
    };
  } catch (e) {
    console.warn("Cache read failed:", e);
    return null;
  }
}

// formats the cached timestamp into a human-readable string
// e.g. "last updated 4 minutes ago"
export function formatCacheAge(timestamp) {
  if (!timestamp) return "unknown";
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1)  return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}