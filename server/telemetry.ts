export type VehicleTelemetry = {
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
  driveMode: DriveMode;
  alerts: TelemetryAlert[];
  stateOfCharge: "charging" | "driving" | "parked";
  location: {
    lat: number;
    lon: number;
  };
};

export type DriveMode = "city" | "highway" | "charging" | "parked";
export type AlertSeverity = "info" | "warning" | "critical";

export type TelemetryAlert = {
  code: string;
  severity: AlertSeverity;
  message: string;
};

const vehicleIds = ["SAN-001", "SAN-002", "SAN-003", "SAN-004"];

type VehicleState = {
  vehicleId: string;
  speedKph: number;
  batteryPct: number;
  odometerKm: number;
  lat: number;
  lon: number;
  driveMode: DriveMode;
  modeTicksRemaining: number;
};

const states: VehicleState[] = vehicleIds.map((vehicleId, index) => ({
  vehicleId,
  speedKph: 42 + index * 12,
  batteryPct: 88 - index * 9,
  odometerKm: 18000 + index * 2350,
  lat: 37.3947 + index * 0.012,
  lon: -122.1503 - index * 0.011,
  driveMode: index === 0 ? "highway" : index === 1 ? "city" : index === 2 ? "charging" : "parked",
  modeTicksRemaining: 18 + index * 6
}));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const jitter = (amount: number) => (Math.random() - 0.5) * amount;

export function nextTelemetry(): VehicleTelemetry[] {
  return states.map((state, index) => nextVehicleTelemetry(state, index));
}

function nextVehicleTelemetry(state: VehicleState, index: number): VehicleTelemetry {
  state.modeTicksRemaining -= 1;
  if (state.modeTicksRemaining <= 0) {
    state.driveMode = nextDriveMode(state.driveMode);
    state.modeTicksRemaining = 16 + Math.floor(Math.random() * 28);
  }

  const targetSpeed = targetSpeedForMode(state.driveMode);
  state.speedKph = clamp(state.speedKph + (targetSpeed - state.speedKph) * 0.22 + jitter(9), 0, 138);

  const isCharging = state.driveMode === "charging";
  const stateOfCharge: VehicleTelemetry["stateOfCharge"] = isCharging
    ? "charging"
    : state.driveMode === "parked"
      ? "parked"
      : "driving";

  if (isCharging) {
    state.speedKph = clamp(state.speedKph * 0.35, 0, 6);
  }

  const batteryDelta =
    stateOfCharge === "charging"
      ? 0.09 + Math.random() * 0.11
      : -(state.speedKph / 8200) - Math.max(0, state.speedKph - 95) / 14000;
  state.batteryPct = clamp(state.batteryPct + batteryDelta, 10, 100);
  state.odometerKm += state.speedKph / 3600;
  state.lat += state.speedKph > 2 ? jitter(0.0007) : jitter(0.00008);
  state.lon += state.speedKph > 2 ? jitter(0.0007) : jitter(0.00008);

  const loadFactor = state.speedKph / 140;
  const batteryTempC = 25 + loadFactor * 16 + (isCharging ? 4 : 0) + jitter(2.8);
  const motorTempC = 34 + loadFactor * 38 + jitter(6);
  const cabinTempC = 21 + Math.sin(Date.now() / 60000 + index) * 2 + jitter(0.8);
  const powerKw =
    stateOfCharge === "charging"
      ? -48 - Math.random() * 42
      : state.driveMode === "city" && Math.random() > 0.78
        ? -8 - Math.random() * 18
        : loadFactor * 190 + jitter(18);
  const efficiencyKwhPer100Km = calculateEfficiency(state.speedKph, powerKw);
  const healthScore = calculateHealthScore({
    batteryPct: state.batteryPct,
    batteryTempC,
    motorTempC,
    efficiencyKwhPer100Km
  });
  const alerts = buildAlerts({
    batteryPct: state.batteryPct,
    batteryTempC,
    motorTempC,
    speedKph: state.speedKph,
    healthScore,
    stateOfCharge
  });

  return {
    vehicleId: state.vehicleId,
    timestamp: new Date().toISOString(),
    speedKph: Number(state.speedKph.toFixed(1)),
    batteryPct: Number(state.batteryPct.toFixed(1)),
    batteryTempC: Number(batteryTempC.toFixed(1)),
    cabinTempC: Number(cabinTempC.toFixed(1)),
    motorTempC: Number(motorTempC.toFixed(1)),
    rangeKm: Number((state.batteryPct * 4.9).toFixed(1)),
    odometerKm: Number(state.odometerKm.toFixed(1)),
    powerKw: Number(powerKw.toFixed(1)),
    efficiencyKwhPer100Km: Number(efficiencyKwhPer100Km.toFixed(1)),
    healthScore,
    driveMode: state.driveMode,
    alerts,
    stateOfCharge,
    location: {
      lat: Number(state.lat.toFixed(5)),
      lon: Number(state.lon.toFixed(5))
    }
  };
}

export function calculateHealthScore({
  batteryPct,
  batteryTempC,
  motorTempC,
  efficiencyKwhPer100Km
}: {
  batteryPct: number;
  batteryTempC: number;
  motorTempC: number;
  efficiencyKwhPer100Km: number;
}) {
  const batteryPenalty = batteryPct < 20 ? (20 - batteryPct) * 1.6 : 0;
  const batteryTempPenalty = Math.max(0, batteryTempC - 42) * 2.2;
  const motorTempPenalty = Math.max(0, motorTempC - 78) * 1.8;
  const efficiencyPenalty = Math.max(0, efficiencyKwhPer100Km - 24) * 1.1;

  return Math.round(clamp(100 - batteryPenalty - batteryTempPenalty - motorTempPenalty - efficiencyPenalty, 0, 100));
}

export function validateTelemetryBatch(batch: VehicleTelemetry[]) {
  return batch.every(
    (vehicle) =>
      vehicle.vehicleId.length > 0 &&
      Number.isFinite(vehicle.speedKph) &&
      Number.isFinite(vehicle.batteryPct) &&
      Number.isFinite(vehicle.motorTempC) &&
      Number.isFinite(vehicle.healthScore) &&
      vehicle.batteryPct >= 0 &&
      vehicle.batteryPct <= 100 &&
      vehicle.healthScore >= 0 &&
      vehicle.healthScore <= 100
  );
}

function buildAlerts({
  batteryPct,
  batteryTempC,
  motorTempC,
  speedKph,
  healthScore,
  stateOfCharge
}: {
  batteryPct: number;
  batteryTempC: number;
  motorTempC: number;
  speedKph: number;
  healthScore: number;
  stateOfCharge: VehicleTelemetry["stateOfCharge"];
}): TelemetryAlert[] {
  const alerts: TelemetryAlert[] = [];

  if (batteryPct < 18 && stateOfCharge !== "charging") {
    alerts.push({ code: "LOW_BATTERY", severity: "critical", message: "Battery below 18%" });
  } else if (batteryPct < 28 && stateOfCharge !== "charging") {
    alerts.push({ code: "BATTERY_WATCH", severity: "warning", message: "Battery below 28%" });
  }

  if (motorTempC > 86) {
    alerts.push({ code: "MOTOR_TEMP_CRITICAL", severity: "critical", message: "Motor temperature critical" });
  } else if (motorTempC > 74) {
    alerts.push({ code: "MOTOR_TEMP_WATCH", severity: "warning", message: "Motor temperature elevated" });
  }

  if (batteryTempC > 46) {
    alerts.push({ code: "BATTERY_TEMP_WATCH", severity: "warning", message: "Battery temperature elevated" });
  }

  if (speedKph > 125) {
    alerts.push({ code: "SPEED_SPIKE", severity: "warning", message: "High-speed event detected" });
  }

  if (healthScore < 55) {
    alerts.push({ code: "HEALTH_DEGRADED", severity: "critical", message: "Vehicle health score degraded" });
  }

  return alerts;
}

function calculateEfficiency(speedKph: number, powerKw: number) {
  if (speedKph < 8 || powerKw <= 0) {
    return 0;
  }

  return clamp((powerKw / speedKph) * 100, 10, 42);
}

function targetSpeedForMode(mode: DriveMode) {
  switch (mode) {
    case "highway":
      return 102 + jitter(18);
    case "city":
      return 42 + jitter(28);
    case "charging":
      return 0;
    case "parked":
      return Math.random() > 0.88 ? 8 : 0;
  }
}

function nextDriveMode(current: DriveMode): DriveMode {
  const modes: DriveMode[] = current === "charging" ? ["city", "parked"] : ["city", "highway", "charging", "parked"];
  return modes[Math.floor(Math.random() * modes.length)];
}
