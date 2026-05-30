# Sanchar Dashboard

Real-time vehicle telemetry dashboard that streams mock vehicle data over WebSockets and visualizes speed, battery, temperature, range, and health signals live.

## MVP

- React dashboard with live telemetry cards and trend lines
- Node.js WebSocket server emitting mock EV telemetry every second
- Optional InfluxDB writer for time-series storage
- Connection state, heartbeat, reconnect backoff, and stale-data handling
- Vehicle health score, alert feed, efficiency trend, comparison view, and mock fleet map
- REST endpoints for latest and historical telemetry
- Scenario controls for demoing low-battery, overheating, charging, and offline states
- Optional API bearer token for basic fleet access control

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
GET /api/vehicles/:vehicleId/history?range=5m
GET /api/fleet/summary
GET /metrics
POST /api/alerts/:alertId/acknowledge
POST /api/alerts/:alertId/resolve
POST /api/simulator/scenario
```

Scenario body:

```json
{
  "vehicleId": "SAN-001",
  "scenario": "low-battery"
}
```

Supported scenarios: `normal`, `low-battery`, `overheat`, `charging`, `offline`.

Set `API_TOKEN` to require `Authorization: Bearer <token>` for API calls.

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

The WebSocket/API integration test runs in CI and is skipped on the local Windows sandbox because process spawning is restricted there.

## Deployment

- Frontend: use `vercel.json` with `VITE_WS_URL` and `VITE_API_URL` pointed at the backend.
- Backend: use `render.yaml` as a starting point for Render. Make sure the host supports WebSockets.
- Database: use hosted InfluxDB or the provided Docker Compose setup.

## Hardening Roadmap

1. Query historical chart ranges directly from InfluxDB instead of in-memory history.
2. Add authenticated users and saved fleet views.
3. Add geofence rules and route playback.
4. Add structured logs and runtime metrics.
5. Deploy the client and server behind a production WebSocket-compatible host.
