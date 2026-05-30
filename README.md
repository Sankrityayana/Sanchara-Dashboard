# Sanchar Dashboard

Real-time vehicle telemetry dashboard that streams mock vehicle data over WebSockets and visualizes speed, battery, temperature, range, and health signals live.

## MVP

- React dashboard with live telemetry cards and trend lines
- Node.js WebSocket server emitting mock EV telemetry every second
- Optional InfluxDB writer for time-series storage
- Connection state and stale-data handling in the UI

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The WebSocket server runs on `ws://localhost:8080`.

## Optional InfluxDB

Copy `.env.example` to `.env` and set:

```bash
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=...
INFLUX_ORG=sanchar
INFLUX_BUCKET=vehicle_telemetry
```

The server skips InfluxDB writes when these variables are not configured.

## Hardening Roadmap

1. Add persistent vehicle history queries from InfluxDB.
2. Add per-vehicle selection and multi-vehicle streams.
3. Add alert thresholds for thermal, battery, and charging states.
4. Add reconnect backoff, data validation, and observability.
5. Containerize the app and InfluxDB for one-command local startup.
