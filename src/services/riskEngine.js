// src/services/riskEngine.js
// Converts raw Open-Meteo data into a user-facing risk level.
// Thresholds based on PAGASA rainfall intensity classification:
//   Light < 2.5mm/hr | Moderate 2.5–7.5 | Heavy 7.5–15 | Intense > 15

/**
 * @param {number}  rainfallMm      - rainfall this hour in mm (from weatherService)
 * @param {boolean} isInFloodZone   - whether user is inside a known flood-prone area
 * @param {number}  weatherCode     - WMO weather code from Open-Meteo
 * @param {number[]} rainfallNext3h - next 3 hours of rainfall forecast
 * @returns {{ level, label, color, advice, showEvacuateBtn }}
 */
export function calculateRisk(rainfallMm, isInFloodZone, weatherCode = 0, rainfallNext3h = []) {

  // thunderstorm codes: 95, 96, 99 — always treat as at least moderate
  const isThunderstorm = weatherCode >= 95;

  // if more rain is coming in the next 3 hours, factor that in
  const maxNext3h = Math.max(...rainfallNext3h, 0);

  if (isInFloodZone && (rainfallMm >= 15 || (isThunderstorm && rainfallMm >= 7.5))) {
    return {
      level:           "high",
      label:           "HIGH RISK",
      color:           "#B3352C",
      advice:          "Evacuate now. Proceed to your nearest safe zone immediately.",
      showEvacuateBtn: true,
    };
  }

  if (
    (isInFloodZone && rainfallMm >= 2.5) ||
    isThunderstorm ||
    rainfallMm >= 15 ||
    maxNext3h >= 7.5
  ) {
    return {
      level:           "moderate",
      label:           "MODERATE RISK",
      color:           "#C98A1F",
      advice:          "Heavy rainfall or thunderstorm detected. Prepare your go-bag and stay ready to evacuate.",
      showEvacuateBtn: false,
    };
  }

  return {
    level:           "low",
    label:           "LOW RISK",
    color:           "#2F7D32",
    advice:          "No immediate flood threat. Continue monitoring conditions.",
    showEvacuateBtn: false,
  };
}

/**
 * Check if coordinates fall within any known flood-prone zone.
 * Uses a simple radius check — no GIS library needed.
 *
 * @param {number}   userLat
 * @param {number}   userLng
 * @param {Array}    floodZones  - array from src/data/floodZones.json
 * @param {number}   radiusKm   - how close counts as "in" the zone (default 0.5km)
 * @returns {boolean}
 */
export function isInFloodZone(userLat, userLng, floodZones, radiusKm = 0.5) {
  return floodZones.some((zone) => {
    const dist = haversineDistance(userLat, userLng, zone.lat, zone.lng);
    return dist <= radiusKm;
  });
}

// straight-line distance between two lat/lng points in km
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

function toRad(deg) {
  return (deg * Math.PI) / 180;
}