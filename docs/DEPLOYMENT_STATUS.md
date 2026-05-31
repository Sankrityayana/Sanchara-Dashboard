# Deployment Status

Sanchar Dashboard is deployment-ready and has been adapted for cloud hosts that expose one public web port.

## Current Deployment Model

| Layer | Platform | Purpose |
| --- | --- | --- |
| Frontend | Vercel | Hosts the Vite React dashboard |
| Backend | Render | Runs the Node.js REST and WebSocket service |
| Database | Optional InfluxDB Cloud | Stores historical telemetry when configured |

## Backend

The backend serves both REST API and WebSocket traffic from the same HTTP server.

```text
REST:      https://<backend-host>
WebSocket: wss://<backend-host>
Health:   https://<backend-host>/health
```

For Render, the service should use:

```text
Build command: npm ci --no-audit --no-fund && npm run build
Start command: npm run server
```

Render provides `PORT` automatically. Do not configure separate `WS_PORT` and `API_PORT` values for production.

## Frontend Environment

Set these variables in Vercel:

```text
VITE_API_URL=https://<backend-host>
VITE_WS_URL=wss://<backend-host>
```

After changing environment variables, redeploy the Vercel project.

## Verification Checklist

- `/health` returns `{ "ok": true }`
- Dashboard connection badge shows `live`
- Vehicle cards update every second
- Scenario buttons update selected vehicle state
- Browser console has no WebSocket connection failures
- Favicon loads from `/favicon.svg`

## Known Runtime Behavior

On Render free tier, the backend may sleep after inactivity. During wake-up, the frontend can temporarily show `connecting`, `retrying`, or `stale`. Opening `/health` or refreshing the frontend wakes the backend.
