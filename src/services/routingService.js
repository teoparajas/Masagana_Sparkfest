// src/services/routingService.js
// Routing with automatic fallback:
//   1. Try Google Directions API (via Maps JS SDK — no extra REST call)
//   2. If that fails or is blocked, fall back to public OSRM server
//   3. Cache the last successful route to localStorage for offline display

const ROUTE_CACHE_KEY = "fw_cached_route";

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Get a walking route between two points.
 * Tries Google Directions first, then OSRM.
 *
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {google.maps.DirectionsService | null} directionsService
 * @returns {Promise<RouteResult | null>}
 *
 * RouteResult shape:
 * {
 *   points:       Array<{ lat, lng }>,  — path to draw as a Polyline
 *   distanceText: string,               — e.g. "1.8 km"
 *   durationText: string,               — e.g. "22 mins"
 *   source:       "google" | "osrm",    — which API succeeded
 * }
 */
export async function getWalkingRoute(origin, destination, directionsService) {
  // try Google first if the service instance is available
  if (directionsService) {
    const googleResult = await tryGoogleDirections(
      origin,
      destination,
      directionsService
    );
    if (googleResult) {
      saveRouteCache(googleResult);
      return googleResult;
    }
  }

  // Google failed or unavailable — try OSRM
  console.warn("Google Directions unavailable, trying OSRM fallback...");
  const osrmResult = await tryOSRM(origin, destination);
  if (osrmResult) {
    saveRouteCache(osrmResult);
    return osrmResult;
  }

  // both failed — load from cache
  console.warn("Both routing sources failed, loading cached route.");
  return loadRouteCache();
}

// ── Google Directions ─────────────────────────────────────────────────────────

async function tryGoogleDirections(origin, destination, directionsService) {
  return new Promise((resolve) => {
    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status !== "OK") {
          console.warn("Google Directions status:", status);
          resolve(null);
          return;
        }

        const leg = result.routes[0].legs[0];

        // extract the path points from the overview polyline
        const points = result.routes[0].overview_path.map((latLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng(),
        }));

        resolve({
          points,
          distanceText: leg.distance.text,
          durationText: leg.duration.text,
          source:       "google",
          // store the full DirectionsResult too so
          // DirectionsRenderer can use it if we want later
          raw: result,
        });
      }
    );
  });
}

// ── OSRM fallback ─────────────────────────────────────────────────────────────

async function tryOSRM(origin, destination) {
  try {
    // OSRM expects lng,lat order (GeoJSON) — not lat,lng
    const url =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      `?overview=full&geometries=geojson&steps=false`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes.length) return null;

    const route = data.routes[0];

    // GeoJSON coordinates are [lng, lat] — flip to { lat, lng } for Google Maps
    const points = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

    const distanceKm   = (route.distance / 1000).toFixed(1);
    const durationMins = Math.ceil(route.duration / 60);

    return {
      points,
      distanceText: `${distanceKm} km`,
      durationText: `${durationMins} min walk`,
      source:       "osrm",
    };

  } catch (err) {
    console.warn("OSRM fetch failed:", err.message);
    return null;
  }
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function saveRouteCache(routeResult) {
  try {
    // don't cache the raw DirectionsResult — it contains
    // circular references that break JSON.stringify
    const { raw, ...cacheable } = routeResult;
    localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(cacheable));
  } catch (e) {
    console.warn("Route cache write failed:", e);
  }
}

export function loadRouteCache() {
  try {
    const cached = localStorage.getItem(ROUTE_CACHE_KEY);
    if (!cached) return null;
    return { ...JSON.parse(cached), fromCache: true };
  } catch (e) {
    return null;
  }
}

export function clearRouteCache() {
  localStorage.removeItem(ROUTE_CACHE_KEY);
}

// ── Nearest safe zone helper ──────────────────────────────────────────────────

/**
 * Find the closest safe zone to the user's location by straight-line distance.
 * Used to auto-suggest a route without the user having to tap a pin.
 *
 * @param {{ lat: number, lng: number }} userLocation
 * @param {Array} safeZones — from src/data/safeZones.json
 * @returns {object} the closest safe zone entry
 */
export function findNearestSafeZone(userLocation, safeZones) {
  let nearest     = null;
  let nearestDist = Infinity;

  safeZones.forEach((zone) => {
    const dist = haversineDistance(
      userLocation.lat, userLocation.lng,
      zone.lat,         zone.lng
    );
    if (dist < nearestDist) {
      nearest     = zone;
      nearestDist = dist;
    }
  });

  return nearest;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}