# Frontend Guide

The frontend is a React + TypeScript + Vite application.

## Entry Point

```text
src/main.tsx
```

This file owns:

- WebSocket connection lifecycle
- received telemetry state
- local vehicle tracking
- scenario overrides
- chart history
- selected vehicle state
- alert and scenario command handlers

## Components

```text
src/components/FleetSummaryStrip.tsx
src/components/VehicleList.tsx
src/components/ScenarioControls.tsx
src/components/MetricCard.tsx
src/components/TrendChart.tsx
src/components/AlertPanel.tsx
src/components/ComparisonPanel.tsx
src/components/FleetMap.tsx
```

## Local Vehicle Tracking

The frontend keeps a local registry of vehicles it has seen:

```ts
type TrackedVehicle = {
  vehicle: VehicleTelemetry;
  online: boolean;
  lastSeenAt: number;
  sampleCount: number;
};
```

This lets the UI show:

- online vehicles
- offline vehicles
- last-seen age
- sample count
- latest known vehicle state

## Scenario Overrides

Scenario overrides are stored locally by vehicle ID:

```ts
Record<string, ScenarioCommand>
```

When new telemetry arrives, the frontend applies the override before rendering. This prevents the next stream tick from undoing the selected scenario.

## WebSocket Connection

The frontend connects to:

```text
VITE_WS_URL
```

Default:

```text
ws://localhost:8090
```

Connection states:

- `connecting`
- `live`
- `offline`
- `stale`

`stale` means the frontend has not received telemetry recently.

## Charts

Charts are lightweight SVG polylines. They use local history by default.

The history range selector supports:

- live memory
- last 5 minutes
- last 30 minutes
- last 1 hour

InfluxDB-backed history is optional.

## Styling

Global styles live in:

```text
src/styles.css
```

The UI is intentionally dashboard-oriented:

- dense but readable
- small-radius panels
- muted operational colors
- clear status indicators
- no marketing landing page
