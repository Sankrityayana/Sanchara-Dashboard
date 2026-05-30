# Telemetry Data Model

The telemetry model represents the live state of an electric vehicle. Each sample is generated once per second by the simulator.

## VehicleTelemetry

```ts
type VehicleTelemetry = {
  vehicleId: string;
  timestamp: string;
  speedKph: number;
  batteryPct: number;
  batteryTempC: number;
  cabinTempC: number;
  motorTempC: number;
  rangeKm: number;
  odometerKm: number;
  powerKw: number;
  efficiencyKwhPer100Km: number;
  healthScore: number;
  driveMode: "city" | "highway" | "charging" | "parked";
  scenario: "normal" | "low-battery" | "overheat" | "charging" | "offline";
  alerts: TelemetryAlert[];
  stateOfCharge: "charging" | "driving" | "parked";
  location: {
    lat: number;
    lon: number;
  };
};
```

## Field Meaning

### `vehicleId`

Unique vehicle identifier. Current simulator vehicles:

```text
SAN-001
SAN-002
SAN-003
```

### `timestamp`

ISO timestamp for the telemetry sample.

### `speedKph`

Vehicle speed in kilometers per hour. This drives odometer and location updates.

### `batteryPct`

Battery state of charge percentage. This affects range and health score.

### `rangeKm`

Estimated remaining range. It is derived from battery percentage, rated range, and efficiency.

### `powerKw`

Current power draw.

- positive value: vehicle is consuming power
- negative value: vehicle is charging
- near zero: parked or stopped

### `efficiencyKwhPer100Km`

Estimated consumption rate. It is derived from speed and power.

### `motorTempC` and `batteryTempC`

Thermal values derived from power load, drive mode, and scenario.

### `healthScore`

A score from `0` to `100`. It penalizes:

- very low battery
- high battery temperature
- high motor temperature
- poor energy efficiency

### `driveMode`

Simulator operating mode:

- `city`: moderate speed, stop-and-go load
- `highway`: higher speed, aerodynamic load
- `charging`: stopped with negative power
- `parked`: stopped with small auxiliary load

### `scenario`

User-controlled demo state:

- `normal`
- `low-battery`
- `overheat`
- `charging`
- `offline`

### `alerts`

Generated diagnostics. Alerts are derived from telemetry thresholds, not random values.

## Coherence Rules

The simulator keeps values related:

- higher speed increases road load
- road load increases power draw
- power draw drains battery
- battery percentage reduces range
- high power raises motor/battery temperatures
- low battery or high temperature reduces health score
- alerts are generated from those same conditions

This avoids arbitrary dashboard values.
