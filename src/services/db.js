// src/services/db.js
// Dexie (IndexedDB) database definition for FloodWatch MM.
// All persistent local storage goes through this database.
// localStorage is kept ONLY for simple non-critical flags.
//
// Schema versioning: every time you add/change a table or index,
// increment the version number and add a new .stores() call.
// Never modify an existing version — always add a new one.

import Dexie from "dexie";

export const db = new Dexie("FloodWatchMMDatabase");

// Version 1 — initial schema
db.version(1).stores({
  // cached weather + risk data per location
  // primary key: areaKey (e.g. "14.6507_121.1029")
  weatherCache: "areaKey, fetchedAt",

  // offline report queue (upgraded from localStorage)
  // primary key: localId (auto-set when queuing)
  reportQueue: "localId, queuedAt",

  // cached route results
  // primary key: routeKey (e.g. "origin_lat_lng__dest_lat_lng")
  routeCache: "routeKey, cachedAt",

  // app-level metadata (last sync time, version flags, etc.)
  // primary key: key (string)
  appMeta: "key",
});

// helper — generate a consistent key from lat/lng pair
export function coordKey(lat, lng) {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

// helper — generate a route cache key from origin + destination
export function routeKey(origin, destination) {
  return `${coordKey(origin.lat, origin.lng)}__${coordKey(destination.lat, destination.lng)}`;
}