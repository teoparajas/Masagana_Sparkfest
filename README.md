<div align="center">

# BAHA NA!

### A Resilient, Offline-First Flood Information System for Metro Manila

*"Essential flood information should remain accessible even when the internet isn't."*



</div>

---

# 📖 Overview

	BAHA NA! is an offline‑first Progressive Web App that delivers flood risk levels, walking evacuation routes, and community‑verified hazard reports to Metro Manila residents even after mobile signal and internet drop. Every safety‑critical output (risk banner, route, safe‑zone list) is cached locally before connectivity fails. User‑generated reports queue offline and sync automatically on reconnection. This is a functional prototype—real map, real routing, real backend—built to prove the offline‑first approach is a credible, doable differentiator with a clear path to production.

---

# 💡 Solution

BAHA NA! combines:

- 🌧️ Real-time weather information
- 📍 Flood-prone area detection
- 🗺️ Safe evacuation routing
- 📢 Community flood reporting
- 💾 Offline caching
- 🔄 Automatic synchronization after reconnecting

The goal is not to replace official emergency services but to provide residents with reliable guidance during connectivity disruptions.

---

# ✨ Key Features

## 🌧️ Live Flood Risk Assessment

- Retrieves live weather data
- Calculates flood risk using predefined thresholds
- Displays easy-to-understand Low / Medium / High risk levels

---

## 🗺️ Interactive Flood Map

- Displays:
  - User's current location
  - Flood-prone zones
  - Evacuation centers
- Calculates the nearest evacuation route

---

## 📢 Community Reporting

Residents can submit reports including:

- Flooded roads
- Impassable routes
- Rising water levels
- Other hazards

Reports appear in a live community feed.

---

## ✅ Automatic Report Verification

Rather than relying on moderators,

multiple matching reports near the same location automatically increase confidence.

When sufficient matching reports are detected, the report status changes from: Pending to Verified


---

## 📶 Offline-First Capability

The application's core feature.

When internet connectivity is lost, BAHA NA! automatically uses cached information instead of becoming unusable.

Cached information includes:

- Flood-prone zones
- Safe zones
- Last known flood risk
- Previously generated evacuation routes

---

## 🔄 Offline Report Queue

If a user submits a report while offline:

- the report is stored locally
- the user receives confirmation
- once connectivity returns,
  the report automatically synchronizes with Firebase.

---

# 🖥️ Demo Workflow

A typical user journey:

```
Open BAHA NA!
        │
        ▼
Retrieve Live Weather
        │
        ▼
Calculate Flood Risk
        │
        ▼
Display Nearby Safe Zones
        │
        ▼
Generate Evacuation Route
        │
        ▼
User Submits Report
        │
        ▼
Internet Lost
        │
        ▼
Application Switches to Cached Data
        │
        ▼
User Submits Report Offline
        │
        ▼
Report Queued Locally
        │
        ▼
Internet Restored
        │
        ▼
Queued Report Automatically Syncs
```

---

# 🏗️ System Architecture

```
                 Weather API
                      │
                      ▼
             Risk Assessment Engine
                      │
                      ▼
Google Maps ─────────► UI ◄──────── Firebase
                      │
                      ▼
          IndexedDB + Service Worker
                      │
                      ▼
               Offline Experience
```

---

# 🛠️ Tech Stack

## Frontend

- React
- Vite

## Backend

- Firebase Authentication
- Cloud Firestore

## Mapping

- Google Maps JavaScript API

## Weather

- OpenWeather API

## Offline Storage

- IndexedDB (Dexie.js)

## Offline Support

- Vite PWA
- Service Worker

## Deployment

- Vercel

---

# 📂 Project Structure

```
src
│
├── components
├── hooks
├── services
├── utils
├── data
├── assets
└── App.jsx
```

---

# ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/teoparajas/Masagana_Sparkfest.git
```

Go to the project

```bash
cd Masagana_Sparkfest
```

Install dependencies

```bash
npm install
```

---

# 🔑 Environment Variables

Create a `.env.local`

```env
VITE_FIREBASE_API_KEY=

VITE_FIREBASE_AUTH_DOMAIN=

VITE_FIREBASE_PROJECT_ID=

VITE_FIREBASE_STORAGE_BUCKET=

VITE_FIREBASE_MESSAGING_SENDER_ID=

VITE_FIREBASE_APP_ID=

VITE_GOOGLE_MAPS_KEY=
```

---

# ▶️ Run Locally

```bash
npm run dev
```

Application:

```
http://localhost:5173
```



# 📡 Offline Functionality

BAHA NA! is designed around an **offline-first** architecture.

When internet connectivity is unavailable:

- Cached flood data remains accessible
- Previously generated evacuation routes remain visible
- Flood risk information continues to display
- Community reports are stored locally
- Reports automatically synchronize when connectivity returns

---

# 📚 Data Sources

- OpenWeather API
- Google Maps Platform
- Google Directions API
- Firebase
- UP NOAH Hazard Maps (Reference Data)
- OpenStreetMap (Evacuation Centers)

---

# 🚧 Current Limitations

This repository contains the **hackathon MVP**.

Current limitations include:

- Metro Manila coverage only
- Simplified rule-based flood risk assessment
- Limited evacuation center dataset
- Firebase free-tier backend
- Web application only (PWA)

---

# 🛣️ Future Roadmap

Planned improvements include:

-  Native Android & iOS application
-  Mesh networking for device-to-device communication
-  Improved flood prediction models
-  Expanded nationwide hazard datasets
-  Push notifications
-  Emergency SOS broadcasting

---

#  Contributors

Developed during the Sparkfest Hackathon.

Team Members

- John Teofilo Parajas
- Roland Caezar Salisi
- Gabriel Angelo Taala
- Carl Daniel Estavillo
