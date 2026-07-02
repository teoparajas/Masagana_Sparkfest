import { useEffect, useState } from "react";
import { fetchCurrentWeather } from "../services/weatherService";
import { loadWeatherCache, formatCacheAge } from "../services/cacheService";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import "./Dashboard.css";

const RAIN_THRESHOLDS = [
  { value: 15, label: "Very heavy", color: "#b71c1c" },
  { value: 7.5, label: "Heavy", color: "#ef6c00" },
  { value: 2.5, label: "Moderate", color: "#f9a825" },
  { value: 0.5, label: "Light", color: "#0288d1" },
];

function getIntensity(rainfallMm) {
  if (rainfallMm === 0) return { label: "None", color: "#2e7d32" };
  return RAIN_THRESHOLDS.find((threshold) => rainfallMm >= threshold.value) || {
    label: "Light",
    color: "#0288d1",
  };
}

function getRainDuration(currentRain, nextRain) {
  const timeline = [currentRain, ...nextRain];
  const firstRainHour = timeline.findIndex((mm) => mm >= 0.5);
  if (firstRainHour === -1) {
    return "No rain expected in the next 3 hours";
  }

  const afterFirst = timeline.slice(firstRainHour);
  const endIndex = afterFirst.findIndex((mm) => mm < 0.5);
  const continuousHours = endIndex === -1 ? afterFirst.length : endIndex;
  const startPhrase = firstRainHour === 0 ? "Continuing rain" : `Rain starting in ${firstRainHour}h`;
  const durationPhrase = continuousHours === 1 ? "about 1 hour" : `about ${continuousHours} hours`;
  return `${startPhrase}, lasting ${durationPhrase}`;
}

function getRainForecastSummary(currentRain, nextRain) {
  const totalNext = nextRain.reduce((sum, mm) => sum + mm, 0);
  if (currentRain >= 0.5) {
    return `Current rain plus ${totalNext.toFixed(1)} mm more over the next 3 hours.`;
  }
  if (totalNext === 0) {
    return "Dry for the next 3 hours.";
  }
  return `Expected ${totalNext.toFixed(1)} mm in the next 3 hours.`;
}

export default function Dashboard({ userLocation }) {
  const isOnline = useOfflineStatus();
  const [weather, setWeather] = useState(null);
  const [cacheAge, setCacheAge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userLocation) return;

    const fetchData = async () => {
      if (!isOnline) {
        const cached = loadWeatherCache();
        if (cached) {
          setWeather(cached.weather);
          setCacheAge(formatCacheAge(cached.timestamp));
          setError(null);
        } else {
          setError("No weather cache available while offline.");
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const weatherData = await fetchCurrentWeather(
        userLocation.lat,
        userLocation.lng
      );

      if (!weatherData) {
        const cached = loadWeatherCache();
        if (cached) {
          setWeather(cached.weather);
          setCacheAge(formatCacheAge(cached.timestamp));
          setError(null);
        } else {
          setError("Unable to load weather data. Try again later.");
        }
        setLoading(false);
        return;
      }

      setWeather(weatherData);
      setCacheAge(null);
      setLoading(false);
    };

    fetchData();
  }, [userLocation, isOnline]);

  if (!userLocation) {
    return (
      <div className="dashboard dashboard--empty">
        <div className="dashboard__empty">Getting your location... please wait.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard dashboard--empty">
        <div className="dashboard__empty">Loading rain dashboard...</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="dashboard dashboard--empty">
        <div className="dashboard__empty">{error || "Weather data not available."}</div>
      </div>
    );
  }

  const intensity = getIntensity(weather.rainfallMm);
  const durationText = getRainDuration(weather.rainfallMm, weather.rainfallNext3h);
  const summaryText = getRainForecastSummary(weather.rainfallMm, weather.rainfallNext3h);
  const totalNext3h = weather.rainfallNext3h.reduce((sum, mm) => sum + mm, 0);
  const maxNext3h = Math.max(...weather.rainfallNext3h, 0);

  const timeline = [
    { label: "Now", value: weather.rainfallMm },
    { label: "+1h", value: weather.rainfallNext3h[0] ?? 0 },
    { label: "+2h", value: weather.rainfallNext3h[1] ?? 0 },
    { label: "+3h", value: weather.rainfallNext3h[2] ?? 0 },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <div className="dashboard__title">Rain dashboard</div>
          <div className="dashboard__subtitle">Rain duration, intensity, and forecast for your location.</div>
        </div>
        <div className="dashboard__status-pill">{isOnline ? "Live" : "Offline"}</div>
      </div>

      <div className="dashboard__grid">
        <section className="dashboard__card dashboard__card--large">
          <div className="dashboard__card-title">Rain duration</div>
          <div className="dashboard__card-value">{durationText}</div>
          <div className="dashboard__card-note">{summaryText}</div>
        </section>

        <section className="dashboard__card">
          <div className="dashboard__card-title">Current rainfall</div>
          <div className="dashboard__card-value">{weather.rainfallMm.toFixed(1)} mm/hr</div>
          <div className="dashboard__metric-row">
            <span className="dashboard__metric-label">Intensity</span>
            <span className="dashboard__metric-value" style={{ color: intensity.color }}>
              {intensity.label}
            </span>
          </div>
        </section>

        <section className="dashboard__card">
          <div className="dashboard__card-title">Next 3h total</div>
          <div className="dashboard__card-value">{totalNext3h.toFixed(1)} mm</div>
          <div className="dashboard__metric-row">
            <span className="dashboard__metric-label">Peak</span>
            <span className="dashboard__metric-value">{maxNext3h.toFixed(1)} mm</span>
          </div>
        </section>

        <section className="dashboard__card">
          <div className="dashboard__card-title">Conditions</div>
          <div className="dashboard__mini-grid">
            <div>
              <span className="dashboard__mini-label">Temp</span>
              <div className="dashboard__mini-value">{weather.tempC}°C</div>
            </div>
            <div>
              <span className="dashboard__mini-label">Humidity</span>
              <div className="dashboard__mini-value">{weather.humidity ?? "—"}%</div>
            </div>
            <div>
              <span className="dashboard__mini-label">Wind</span>
              <div className="dashboard__mini-value">{weather.windKph ?? "—"} km/h</div>
            </div>
          </div>
        </section>
      </div>

      <section className="dashboard__timeline-card">
        <div className="dashboard__card-title">Rain forecast timeline</div>
        <div className="dashboard__timeline">
          {timeline.map((item) => {
            const barHeight = Math.min(100, item.value * 10 + 12);
            const barColor = item.value >= 7.5 ? "#d32f2f" : item.value >= 2.5 ? "#f9a825" : item.value > 0 ? "#0288d1" : "#90a4ae";
            return (
              <div key={item.label} className="dashboard__timeline-item">
                <div className="dashboard__timeline-bar" style={{ height: `${barHeight}%`, background: barColor }} />
                <div className="dashboard__timeline-value">{item.value.toFixed(1)} mm</div>
                <div className="dashboard__timeline-label">{item.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {cacheAge && (
        <div className="dashboard__cache-note">Showing cached weather data · last updated {cacheAge}</div>
      )}
    </div>
  );
}
