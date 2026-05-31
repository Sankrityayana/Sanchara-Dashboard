# Demo Guide

## Local Demo

Install dependencies:

```bash
npm install
```

Run dashboard and backend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Local services:

```text
Frontend: http://localhost:5173
Backend API: http://localhost:8090
WebSocket: ws://localhost:8090
```

## Demo Script

1. Open the dashboard.
2. Select `SAN-001` in the vehicle list.
3. Show live telemetry cards and charts.
4. Click **Low battery**.
   - Battery drops.
   - Range drops.
   - Health score degrades.
   - Low-battery alert appears.
5. Click **Overheat**.
   - Motor temperature increases.
   - Battery temperature increases.
   - Thermal alerts appear.
6. Click **Charging**.
   - Speed becomes `0`.
   - Power becomes negative.
   - State changes to charging.
7. Click **Offline**.
   - Vehicle is marked offline in local tracking.
8. Click **Normal**.
   - Vehicle returns to a healthy baseline state.

## What To Say In An Interview

Sanchar Dashboard simulates an EV telemetry pipeline. The backend produces coherent vehicle state, streams it over WebSockets, optionally persists it into InfluxDB, and exposes health/API endpoints. The frontend tracks vehicles locally, visualizes the stream, derives health/alerts, and lets users force scenarios for demoing failure modes.
