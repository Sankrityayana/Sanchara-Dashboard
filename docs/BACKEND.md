# Backend Guide

The backend is a Node.js TypeScript service.

## Entry Point

```text
server/index.ts
```

Responsibilities:

- start one HTTP server for REST and WebSocket traffic
- broadcast telemetry every second
- handle WebSocket commands
- store in-memory history
- write telemetry to InfluxDB if configured
- expose health and metrics endpoints

## Telemetry Simulator

Simulator file:

```text
server/telemetry.ts
```

The simulator maintains state for three vehicles:

```text
SAN-001
SAN-002
SAN-003
```

Each vehicle has:

- battery capacity
- rated range
- current speed
- battery percentage
- odometer
- temperature state
- location and heading
- drive mode
- optional forced scenario

## Coherent Metric Derivation

Every tick:

1. Determine drive mode and target speed.
2. Move current speed toward target speed.
3. Calculate road load power from speed and mode.
4. Apply charging or scenario power changes.
5. Update battery percentage from power usage.
6. Update odometer and GPS location from speed.
7. Update motor/battery temperatures from power and scenario.
8. Calculate efficiency.
9. Calculate range.
10. Calculate health score.
11. Generate alerts.

## WebSocket Messages

Server sends:

- `hello`
- `telemetry`
- `heartbeat`
- `command-result`

Client sends:

- `scenario`
- `alert`

## REST API

The REST API is useful for external automation and debugging. The browser demo primarily uses WebSockets. Both protocols share the same backend port, which keeps Render/Railway/Fly deployment straightforward.

## Metrics

`GET /metrics` returns:

- service start time
- telemetry batches generated
- telemetry messages sent
- API request count
- connected WebSocket clients
- online vehicles

## Shutdown

The backend listens for:

- `SIGINT`
- `SIGTERM`

On shutdown, it clears intervals, closes WebSocket/API servers, flushes InfluxDB writes, and exits.
