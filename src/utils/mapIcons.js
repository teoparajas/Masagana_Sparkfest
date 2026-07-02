// src/utils/mapIcons.js
// Custom SVG marker icons for Google Maps.
// Using SVG paths means no external image files needed.

/**
 * Returns a Google Maps icon object for a given pin type.
 * Call this only after the Maps JS API has loaded (window.google exists).
 *
 * @param {"user" | "flood-high" | "flood-moderate" | "safe" | "report"} type
 * @returns {google.maps.Symbol}
 */
export function getMarkerIcon(type) {
  const base = {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 10,
    strokeWeight: 2,
  };

  switch (type) {
    case "user":
      return {
        ...base,
        fillColor:   "#2B6FD1",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        scale:       10,
      };

    case "flood-high":
      return {
        ...base,
        fillColor:   "#B3352C",
        fillOpacity: 0.9,
        strokeColor: "#7a1f18",
        scale:       12,
      };

    case "flood-moderate":
      return {
        ...base,
        fillColor:   "#C98A1F",
        fillOpacity: 0.9,
        strokeColor: "#8a5e10",
        scale:       10,
      };

    case "safe":
      return {
        ...base,
        fillColor:   "#2F7D32",
        fillOpacity: 1,
        strokeColor: "#1b5e20",
        scale:       11,
      };

    case "report":
      return {
        ...base,
        fillColor:   "#7B1FA2",
        fillOpacity: 0.85,
        strokeColor: "#4a0072",
        scale:       8,
      };

    default:
      return base;
  }
}