// src/App.jsx
import { useState, useEffect } from "react";
import RiskBanner from "./components/RiskBanner";
import MapView    from "./components/MapView";
import "./App.css";

export default function App() {
  const [userLocation,     setUserLocation]     = useState(null);
  const [selectedSafeZone, setSelectedSafeZone] = useState(null);

  // single GPS call at the app level — shared down to all components
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation({ lat: 14.5995, lng: 120.9842 }); // Metro Manila fallback
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
      () => setUserLocation({ lat: 14.5995, lng: 120.9842 }),
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "16px" }}>
      <h2 style={{ fontFamily: "Arial", color: "#1F3A5F", marginBottom: "12px" }}>
        FloodWatch MM
      </h2>

      <RiskBanner userLocation={userLocation} />
      <MapView
        userLocation={userLocation}
        onSafeZoneSelect={setSelectedSafeZone}
      />

      {/* placeholder — routing output goes here in task 2.4 */}
      {selectedSafeZone && (
        <div style={{
          padding: "10px 14px",
          background: "#e8f5e9",
          borderRadius: "6px",
          fontFamily: "Arial",
          fontSize: "13px",
          color: "#2F7D32",
          marginTop: "8px"
        }}>
          ✅ Selected: <b>{selectedSafeZone.name}</b> —
          route calculation coming in task 2.4
        </div>
      )}
    </div>
  );
}