// src/services/routingService.js
// Wraps Google Directions API — called once per user session,
// result is cached offline so it survives connectivity loss

/**
 * Calculate route from user's location to the nearest safe zone.
 * Uses the Google Directions Service (loaded with the Maps JS API —
 * no separate HTTP call needed, no CORS issues).
 *
 * @param {google.maps.DirectionsService} directionsService - instantiated in MapView
 * @param {{ lat: number, lng: number }} origin             - user's GPS coords
 * @param {{ lat: number, lng: number }} destination        - nearest safe zone coords
 * @returns {Promise<google.maps.DirectionsResult | null>}
 */
export async function getRoute(directionsService, origin, destination) {
  return new Promise((resolve) => {
    directionsService.route(
      {
        origin,
        destination,
        // Walking — more appropriate for flood evacuation than driving
        // (roads may be impassable, pedestrian routes are safer)
        travelMode: window.google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === "OK") {
          resolve(result);
        } else {
          console.warn("Directions API failed:", status);
          resolve(null); // caller will show cached route or fallback message
        }
      }
    );
  });
}

/**
 * Find the nearest safe zone to the user's current location.
 * Uses straight-line distance (Haversine) — good enough for an MVP.
 * Routing API is only called for the nearest one, keeping API calls minimal.
 *
 * @param {{ lat: number, lng: number }} userLocation
 * @param {Array} safeZones - array from src/data/safeZones.json
 * @returns {object} the closest safe zone entry
 */
export function findNearestSafeZone(userLocation, safeZones) {
  return safeZones.reduce((nearest, zone) => {
    const dist = haversineDistance(
      userLocation.lat, userLocation.lng,
      zone.lat, zone.lng
    );
    return dist < nearest.dist ? { ...zone, dist } : nearest;
  }, { ...safeZones[0], dist: Infinity });
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return (deg * Math.PI) / 180; }