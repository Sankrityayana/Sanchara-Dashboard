# InfluxDB Guide

InfluxDB is optional. The dashboard works without it.

## Why InfluxDB

Vehicle telemetry is time-series data:

- every sample has a timestamp
- values are queried over time windows
- charts often need ranges like last 5 minutes or last hour

InfluxDB is optimized for this style of data.

## Local Setup

Run:

```bash
docker compose up --build
```

This starts InfluxDB on:

```text
http://localhost:8086
```

Default local values in `docker-compose.yml`:

```text
INFLUX_ORG=sanchar
INFLUX_BUCKET=vehicle_telemetry
INFLUX_TOKEN=dev-token
```

## Backend Configuration

Set:

```text
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=dev-token
INFLUX_ORG=sanchar
INFLUX_BUCKET=vehicle_telemetry
```

If any value is missing, the backend skips persistence and logs that InfluxDB is not configured.

## Measurement

Telemetry is written to:

```text
vehicle_telemetry
```

Tags:

- `vehicleId`
- `stateOfCharge`
- `driveMode`

Fields:

- speed
- battery
- temperatures
- range
- odometer
- power
- efficiency
- health score
- latitude
- longitude

## History Query

The backend supports:

```text
GET /api/vehicles/:vehicleId/history?range=5m
```

If InfluxDB is configured, it queries InfluxDB. If not, it falls back to in-memory history.
