# API Reference

The dashboard uses WebSockets for the live demo path. REST APIs are available for health checks, metrics, fleet state, scenario automation, and historical queries.

## WebSocket

Default URL:

```text
ws://localhost:8080
```

Server messages:

```json
{
  "type": "telemetry",
  "vehicles": []
}
```

```json
{
  "type": "heartbeat",
  "timestamp": "2026-05-30T00:00:00.000Z"
}
```

Client scenario command:

```json
{
  "type": "scenario",
  "vehicleId": "SAN-001",
  "scenario": "low-battery"
}
```

Client alert command:

```json
{
  "type": "alert",
  "alertId": "SAN-001:LOW_BATTERY",
  "action": "acknowledge"
}
```

## REST

Default API URL:

```text
http://localhost:8090
```

Endpoints:

```text
GET /health
GET /metrics
GET /api/vehicles
GET /api/vehicles/:vehicleId/latest
GET /api/vehicles/:vehicleId/history?limit=120
GET /api/vehicles/:vehicleId/history?range=5m
GET /api/fleet/summary
GET /api/simulator
POST /api/simulator/scenario
POST /api/alerts/:alertId/acknowledge
POST /api/alerts/:alertId/resolve
```

Scenario body:

```json
{
  "vehicleId": "SAN-001",
  "scenario": "overheat"
}
```

Supported scenarios:

```text
normal
low-battery
overheat
charging
offline
```

## Optional Auth

Set `API_TOKEN` on the backend to require:

```text
Authorization: Bearer <token>
```

The browser demo uses WebSocket commands for scenario controls, so REST auth is mainly for external API users.
