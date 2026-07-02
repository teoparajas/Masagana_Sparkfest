// src/services/weatherService.js
// Open-Meteo — completely free, no API key, no signup
// Docs: https://open-meteo.com/en/docs
// License: CC BY 4.0 (attribution required — cite in your README and pitch)

const BASE_URL = "https://api.open-meteo.com/v1";

// Metro Manila target areas — coordinates instead of city name strings
// because Open-Meteo works by lat/lng, not city query
export const TARGET_AREAS = [
  { id: "marikina",     name: "Marikina",      lat: 14.6507, lng: 121.1029 },
  { id: "quezon-city",  name: "Quezon City",   lat: 14.6760, lng: 121.0437 },
  { id: "pasig",        name: "Pasig",         lat: 14.5764, lng: 121.0851 },
  { id: "taguig",       name: "Taguig",        lat: 14.5243, lng: 121.0792 },
  { id: "mandaluyong",  name: "Mandaluyong",   lat: 14.5794, lng: 121.0359 },
];

/**
 * Fetch current weather + next 3 hours of forecast for a given lat/lng.
 * Returns rainfall (mm), temperature, and a weather description code.
 * Returns null on network failure — caller should fall back to cached data.
 *
 * Open-Meteo variable reference:
 *   precipitation        — rainfall in mm for that hour
 *   temperature_2m       — air temp at 2m height in °C
 *   relative_humidity_2m — humidity %
 *   weathercode          — WMO weather code (see decodeWeatherCode below)
 *   windspeed_10m        — wind speed at 10m in km/h
 */
export async function fetchCurrentWeather(lat, lng) {
  try {
    const params = new URLSearchParams({
      latitude:              lat,
      longitude:             lng,
      hourly:                "precipitation,temperature_2m,relative_humidity_2m,weathercode,windspeed_10m",
      forecast_days:         1,       // today only — keeps response small
      timezone:              "Asia/Manila",
    });

    const response = await fetch(`${BASE_URL}/forecast?${params}`);

    if (!response.ok) {
      console.error(`Open-Meteo error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Open-Meteo returns parallel arrays — find the index for the current hour
    const now = new Date();
    const currentHour = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
    const idx = data.hourly.time.indexOf(currentHour);
    const i = idx !== -1 ? idx : 0; // fallback to first entry if not found

    return {
      lat,
      lng,
      rainfallMm:   data.hourly.precipitation[i]          ?? 0,
      tempC:        data.hourly.temperature_2m[i]         ?? null,
      humidity:     data.hourly.relative_humidity_2m[i]   ?? null,
      windKph:      data.hourly.windspeed_10m[i]          ?? null,
      weatherCode:  data.hourly.weathercode[i]            ?? 0,
      description:  decodeWeatherCode(data.hourly.weathercode[i] ?? 0),
      // next 3 hours of rainfall — useful for "rain expected soon" warnings
      rainfallNext3h: [
        data.hourly.precipitation[i+1] ?? 0,
        data.hourly.precipitation[i+2] ?? 0,
        data.hourly.precipitation[i+3] ?? 0,
      ],
      fetchedAt: Date.now(),
    };

  } catch (error) {
    console.warn("fetchCurrentWeather failed (offline?):", error.message);
    return null;
  }
}

/**
 * Fetch weather for all TARGET_AREAS at once.
 * Returns an array of results (null entries mean that area's fetch failed).
 */
export async function fetchAllAreas() {
  return Promise.all(
    TARGET_AREAS.map((area) => fetchCurrentWeather(area.lat, area.lng))
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * WMO Weather Interpretation Codes → human-readable label
 * Full table: https://open-meteo.com/en/docs#weathervariables
 */
function decodeWeatherCode(code) {
  if (code === 0)              return "Clear sky";
  if (code <= 3)               return "Partly cloudy";
  if (code <= 49)              return "Foggy";
  if (code <= 59)              return "Drizzle";
  if (code <= 69)              return "Rain";
  if (code <= 79)              return "Snow / sleet";
  if (code <= 84)              return "Rain showers";
  if (code <= 94)              return "Thunderstorm";
  return "Heavy thunderstorm";
}