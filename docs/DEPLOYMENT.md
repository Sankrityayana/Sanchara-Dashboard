# Deployment Guide

Recommended deployment split:

- Frontend: Vercel
- Backend WebSocket/API service: Render, Railway, Fly.io, or another Node host that supports WebSockets
- Database: InfluxDB Cloud or self-hosted InfluxDB

See [Deployment Status](DEPLOYMENT_STATUS.md) for the current production checklist.

## 1. Deploy Backend

The backend must run as a long-lived Node service because it owns the WebSocket server.

### Render

This repo includes `render.yaml` as a starting point.

Expected settings:

```text
Environment: Node
Build command: npm ci --no-audit --no-fund && npm run build
Start command: npm run server
```

Environment variables:

```text
PORT=<provided by host>
INFLUX_URL=<optional>
INFLUX_TOKEN=<optional>
INFLUX_ORG=<optional>
INFLUX_BUCKET=<optional>
API_TOKEN=<optional>
```

Render exposes one public port through the `PORT` environment variable for web services. The backend attaches REST and WebSocket handling to the same HTTP server, so both `https://<backend-host>` and `wss://<backend-host>` use the same public service.

Render supports WebSocket services, but the service must stay running as a web service, not a static site.

Sources:

- [Render Web Services](https://render.com/docs/web-services)
- [Render WebSockets](https://render.com/docs/websocket)

## 2. Deploy Frontend

This repo includes `vercel.json`.

Expected settings:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
```

Set Vercel environment variables:

```text
VITE_WS_URL=wss://<your-backend-host>
VITE_API_URL=https://<your-backend-host>
```

Vite only exposes browser environment variables that start with `VITE_`, so keep that prefix.

Sources:

- [Vercel Vite Docs](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

## 3. InfluxDB

For local development:

```bash
docker compose up --build
```

For hosted deployment, create an InfluxDB bucket and token, then set:

```text
INFLUX_URL=<cloud-url>
INFLUX_TOKEN=<token>
INFLUX_ORG=<org>
INFLUX_BUCKET=vehicle_telemetry
```

The app runs without InfluxDB. Without these values, telemetry streams live and stores short history in memory only.

Source:

- [InfluxDB Node.js Client Docs](https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/nodejs/install/)

## Production Note

Use the backend host root for both API and WebSocket URLs:

```text
VITE_API_URL=https://<backend-host>
VITE_WS_URL=wss://<backend-host>
```
