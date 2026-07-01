// src/App.jsx
import RiskBanner from "./components/RiskBanner";
import "./App.css";

function App() {
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "16px" }}>
      <h2 style={{ fontFamily: "Arial", color: "#1F3A5F", marginBottom: "12px" }}>
        FloodWatch MM
      </h2>
      <RiskBanner />
      {/* MapView, ReportForm, FeedList go here in later tasks */}
    </div>
  );
}

export default App;