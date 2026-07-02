// src/services/cacheService.js
// Handles caching of weather data, risk levels, and app metadata.
// Upgraded from localStorage to IndexedDB (Dexie) for:
//   - larger storage capacity
//   - Service Worker compatibility (needed for Day 4)
//   - non-blocking async reads/writes
//
// Falls back gracefully if IndexedDB is unavailable (private browsing, etc.)

import { db, coordKey } from "./db";

// ── Weather + Risk cache ──────────────────────────────────────────────────────

/**
 * Save weather and risk data to IndexedDB.
 * Keyed by lat/lng so each location has its own cache entry.
 *
 * @param {object} weatherData — from weatherService.fetchCurrentWeather()
 * @param {object} riskData    — from riskEngine.calculateRisk()
 */
export async function saveWeatherCache(weatherData, riskData) {
  try {
    const key = coordKey(weatherData.lat, weatherData.lng);
    await db.weatherCache.put({
      areaKey:     key,
      weather:     weatherData,
      risk:        riskData,
      fetchedAt:   Date.now(),
    });
  } catch (err) {
    console.warn("saveWeatherCache failed:", err.message);
  }
}

/**
 * Load cached weather + risk for a given location.
 * Returns null if no cache exists for those coordinates.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ weather, risk, fetchedAt } | null>}
 */
export async function loadWeatherCache(lat, lng) {
  try {
    const key    = coordKey(lat, lng);
    const cached = await db.weatherCache.get(key);
    return cached ?? null;
  } catch (err) {
    console.warn("loadWeatherCache failed:", err.message);
    return null;
  }
}

/**
 * Load the most recently cached weather entry regardless of location.
 * Used as a last-resort fallback when we don't have the user's exact coords.
 *
 * @returns {Promise<{ weather, risk, fetchedAt } | null>}
 */
export async function loadMostRecentWeatherCache() {
  try {
    // orderBy fetchedAt descending, take the first one
    const cached = await db.weatherCache
      .orderBy("fetchedAt")
      .last();
    return cached ?? null;
  } catch (err) {
    console.warn("loadMostRecentWeatherCache failed:", err.message);
    return null;
  }
}

/**
 * Clear all weather cache entries.
 * Useful for testing or forcing a fresh fetch.
 */
export async function clearWeatherCache() {
  try {
    await db.weatherCache.clear();
  } catch (err) {
    console.warn("clearWeatherCache failed:", err.message);
  }
}

// ── App metadata ──────────────────────────────────────────────────────────────

/**
 * Save a metadata value by key.
 * Used for last-sync timestamps, feature flags, etc.
 *
 * @param {string} key
 * @param {any}    value
 */
export async function setAppMeta(key, value) {
  try {
    await db.appMeta.put({ key, value, updatedAt: Date.now() });
  } catch (err) {
    console.warn("setAppMeta failed:", err.message);
  }
}

/**
 * Get a metadata value by key.
 * @param {string} key
 * @returns {Promise<any | null>}
 */
export async function getAppMeta(key) {
  try {
    const entry = await db.appMeta.get(key);
    return entry?.value ?? null;
  } catch (err) {
    console.warn("getAppMeta failed:", err.message);
    return null;
  }
}

// ── Timestamp formatter (unchanged from localStorage version) ─────────────────

/**
 * Format a fetchedAt timestamp into a human-readable relative string.
 * e.g. "just now", "4 minutes ago", "2 hours ago"
 *
 * @param {number} timestamp — Date.now() value
 * @returns {string}
 */
export function formatCacheAge(timestamp) {
  if (!timestamp) return "unknown";
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1)   return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60)  return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}