# Sanchar Dashboard

Real-time vehicle telemetry dashboard that streams mock vehicle data over WebSockets and visualizes speed, battery, temperature, range, and health signals live.

## MVP

- React dashboard with live telemetry cards and trend lines
- Node.js WebSocket server emitting mock EV telemetry every second
- Optional InfluxDB writer for time-series storage
- Connection state, heartbeat, reconnect backoff, and stale-data handling
- Vehicle health score, alert feed, efficiency trend, comparison view, and mock fleet map
- REST endpoints for latest and historical telemetry

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The WebSocket server runs on `ws://localhost:8080`.
The REST API runs on `http://localhost:8090`.

## API

```bash
GET /health
GET /api/vehicles
GET /api/vehicles/:vehicleId/latest
GET /api/vehicles/:vehicleId/history?limit=120
```

## Optional InfluxDB

Copy `.env.example` to `.env` and set:

```bash
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=...
INFLUX_ORG=sanchar
INFLUX_BUCKET=vehicle_telemetry
```

The server skips InfluxDB writes when these variables are not configured.

## Docker

```bash
docker compose up --build
```

This starts the WebSocket/API server and InfluxDB. Run the React dev server separately with `npm run client`.

## Validation

```bash
npm run typecheck
npm test
npm run build
```

## Hardening Roadmap

1. Query historical chart ranges directly from InfluxDB instead of in-memory history.
2. Add authenticated users and saved fleet views.
3. Add geofence rules and route playback.
4. Add structured logs and runtime metrics.
5. Deploy the client and server behind a production WebSocket-compatible host.
