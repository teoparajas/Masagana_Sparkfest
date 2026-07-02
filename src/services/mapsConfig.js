// src/services/mapsConfig.js
// Central config for Google Maps — import this wherever Maps is used
// so API key and shared options live in one place only

export const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

// Libraries to load with the Maps JS API
// Only load what you actually use — each library adds load time
export const MAPS_LIBRARIES = ["routes"];

// Default map center — Metro Manila
export const METRO_MANILA_CENTER = { lat: 14.5995, lng: 120.9842 };

// Default zoom — shows most of Metro Manila
export const DEFAULT_ZOOM = 12;

// Map styling — stripped back, highlights roads clearly
// Removes POI clutter so flood zones and safe zone pins are visible
export const MAP_STYLE = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", stylers: [{ color: "#a8c8e8" }] },
  { featureType: "landscape", stylers: [{ color: "#f0f4f0" }] },
];