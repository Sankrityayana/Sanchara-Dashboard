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
  scenario: ScenarioCommand;
  alerts: TelemetryAlert[];
  stateOfCharge: "charging" | "driving" | "parked";
  location: {
    lat: number;
    lon: number;
  };
};

export type DriveMode = "city" | "highway" | "charging" | "parked";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type ScenarioCommand = "normal" | "low-battery" | "overheat" | "charging" | "offline";

export type TelemetryAlert = {
  id: string;
  code: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
};

type VehicleState = {
  vehicleId: string;
  speedKph: number;
  batteryPct: number;
  batteryCapacityKwh: number;
  ratedRangeKm: number;
  motorTempC: number;
  batteryTempC: number;
  cabinTempC: number;
  odometerKm: number;
  lat: number;
  lon: number;
  headingDeg: number;
  driveMode: DriveMode;
  modeTicksRemaining: number;
  forcedScenario?: ScenarioCommand;
};

const vehicleProfiles: VehicleState[] = [
  {
    vehicleId: "SAN-001",
    speedKph: 86,
    batteryPct: 82,
    batteryCapacityKwh: 78,
    ratedRangeKm: 505,
    motorTempC: 54,
    batteryTempC: 32,
    cabinTempC: 21,
    odometerKm: 18000,
    lat: 37.3947,
    lon: -122.1503,
    headingDeg: 18,
    driveMode: "highway",
    modeTicksRemaining: 28
  },
  {
    vehicleId: "SAN-002",
    speedKph: 38,
    batteryPct: 64,
    batteryCapacityKwh: 72,
    ratedRangeKm: 455,
    motorTempC: 43,
    batteryTempC: 30,
    cabinTempC: 22,
    odometerKm: 20350,
    lat: 37.4067,
    lon: -122.1613,
    headingDeg: 72,
    driveMode: "city",
    modeTicksRemaining: 34
  },
  {
    vehicleId: "SAN-003",
    speedKph: 0,
    batteryPct: 41,
    batteryCapacityKwh: 82,
    ratedRangeKm: 530,
    motorTempC: 31,
    batteryTempC: 29,
    cabinTempC: 20,
    odometerKm: 22700,
    lat: 37.4187,
    lon: -122.1723,
    headingDeg: 146,
    driveMode: "charging",
    modeTicksRemaining: 22
  }
];
const states: VehicleState[] = vehicleProfiles.map(cloneState);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const jitter = (amount: number) => (Math.random() - 0.5) * amount;

export function nextTelemetry(): VehicleTelemetry[] {
  return states
    .filter((state) => state.forcedScenario !== "offline")
    .map((state, index) => nextVehicleTelemetry(state, index));
}

export function applyScenario(vehicleId: string, scenario: ScenarioCommand) {
  const state = states.find((candidate) => candidate.vehicleId === vehicleId);
  if (!state) {
    return false;
  }

  const profile = vehicleProfiles.find((candidate) => candidate.vehicleId === vehicleId);
  state.forcedScenario = scenario === "normal" ? undefined : scenario;

  if (scenario === "normal" && profile) {
    Object.assign(state, {
      ...cloneState(profile),
      odometerKm: Math.max(state.odometerKm, profile.odometerKm)
    });
    return true;
  }

  if (scenario === "low-battery") {
    state.driveMode = "city";
    state.speedKph = 32;
    state.batteryPct = 12;
    state.motorTempC = 42;
    state.batteryTempC = 32;
  }

  if (scenario === "charging") {
    state.driveMode = "charging";
    state.speedKph = 0;
    state.motorTempC = 31;
    state.batteryTempC = 30;
  }

  if (scenario === "overheat") {
    state.driveMode = "highway";
    state.speedKph = 82;
    state.motorTempC = 88;
    state.batteryTempC = 47;
  }

  if (scenario === "offline") {
    state.speedKph = 0;
  }

  return true;
}

export function listSimulatorVehicles() {
  return states.map((state) => ({
    vehicleId: state.vehicleId,
    scenario: state.forcedScenario ?? "normal",
    driveMode: state.driveMode
  }));
}

function nextVehicleTelemetry(state: VehicleState, index: number): VehicleTelemetry {
  if (!state.forcedScenario) {
    state.modeTicksRemaining -= 1;
  }
  if (!state.forcedScenario && state.modeTicksRemaining <= 0) {
    state.driveMode = nextDriveMode(state.driveMode);
    state.modeTicksRemaining = 24 + Math.floor(Math.random() * 20);
  }

  if (state.forcedScenario === "charging") {
    state.driveMode = "charging";
  }

  if (state.forcedScenario === "overheat" && state.driveMode === "charging") {
    state.driveMode = "highway";
  }

  const targetSpeed = targetSpeedForMode(state.driveMode, index);
  state.speedKph = clamp(state.speedKph + (targetSpeed - state.speedKph) * 0.18 + jitter(3), 0, 118);

  const isCharging = state.driveMode === "charging";
  const stateOfCharge: VehicleTelemetry["stateOfCharge"] = isCharging
    ? "charging"
    : state.driveMode === "parked"
      ? "parked"
      : "driving";

  if (isCharging) {
    state.speedKph = 0;
  }

  const roadLoadKw = calculateRoadLoadKw(state.speedKph, state.driveMode);
  const auxiliaryKw = state.driveMode === "parked" ? 0.8 : 1.8;
  const chargingKw = isCharging ? -64 : 0;
  const thermalLoadKw = state.forcedScenario === "overheat" ? 22 : 0;
  const powerKw = isCharging ? chargingKw : roadLoadKw + auxiliaryKw + thermalLoadKw;

  const batteryDeltaPct = isCharging
    ? (-powerKw / state.batteryCapacityKwh / 3600) * 100
    : -(Math.max(powerKw, 0) / state.batteryCapacityKwh / 3600) * 100;
  state.batteryPct = clamp(state.batteryPct + batteryDeltaPct, 5, 100);

  if (state.forcedScenario === "low-battery") {
    state.batteryPct = clamp(Math.min(state.batteryPct, 12) - 0.01, 8, 12);
  }

  state.odometerKm += state.speedKph / 3600;
  advanceLocation(state);

  const ambientTempC = 24 + Math.sin(Date.now() / 120000) * 2;
  const thermalBoost = state.forcedScenario === "overheat" ? 20 : 0;
  const targetMotorTempC = ambientTempC + 12 + Math.max(powerKw, 0) * 0.26 + thermalBoost;
  const targetBatteryTempC = ambientTempC + 4 + Math.abs(powerKw) * 0.07 + thermalBoost * 0.35;
  state.motorTempC = approach(state.motorTempC, targetMotorTempC, 0.14);
  state.batteryTempC = approach(state.batteryTempC, targetBatteryTempC, 0.08);
  state.cabinTempC = approach(state.cabinTempC, 21.5 + Math.sin(Date.now() / 90000 + index), 0.05);

  const efficiencyKwhPer100Km = calculateEfficiency(state.speedKph, powerKw);
  const rangeKm = calculateRangeKm(state.batteryPct, state.ratedRangeKm, efficiencyKwhPer100Km, stateOfCharge);
  const healthScore = calculateHealthScore({
    batteryPct: state.batteryPct,
    batteryTempC: state.batteryTempC,
    motorTempC: state.motorTempC,
    efficiencyKwhPer100Km
  });
  const alerts = buildAlerts(state.vehicleId, {
    batteryPct: state.batteryPct,
    batteryTempC: state.batteryTempC,
    motorTempC: state.motorTempC,
    speedKph: state.speedKph,
    healthScore,
    stateOfCharge
  });

  return {
    vehicleId: state.vehicleId,
    timestamp: new Date().toISOString(),
    speedKph: Number(state.speedKph.toFixed(1)),
    batteryPct: Number(state.batteryPct.toFixed(1)),
    batteryTempC: Number(state.batteryTempC.toFixed(1)),
    cabinTempC: Number(state.cabinTempC.toFixed(1)),
    motorTempC: Number(state.motorTempC.toFixed(1)),
    rangeKm: Number(rangeKm.toFixed(1)),
    odometerKm: Number(state.odometerKm.toFixed(1)),
    powerKw: Number(powerKw.toFixed(1)),
    efficiencyKwhPer100Km: Number(efficiencyKwhPer100Km.toFixed(1)),
    healthScore,
    driveMode: state.driveMode,
    scenario: state.forcedScenario ?? "normal",
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
  const batteryPenalty = batteryPct < 20 ? (20 - batteryPct) * 5 : 0;
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

function buildAlerts(
  vehicleId: string,
  {
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

  if (batteryPct <= 18 && stateOfCharge !== "charging") {
    alerts.push(createAlert(vehicleId, "LOW_BATTERY", "critical", "Battery below 18%"));
  } else if (batteryPct < 28 && stateOfCharge !== "charging") {
    alerts.push(createAlert(vehicleId, "BATTERY_WATCH", "warning", "Battery below 28%"));
  }

  if (motorTempC > 86) {
    alerts.push(createAlert(vehicleId, "MOTOR_TEMP_CRITICAL", "critical", "Motor temperature critical"));
  } else if (motorTempC > 74) {
    alerts.push(createAlert(vehicleId, "MOTOR_TEMP_WATCH", "warning", "Motor temperature elevated"));
  }

  if (batteryTempC > 46) {
    alerts.push(createAlert(vehicleId, "BATTERY_TEMP_WATCH", "warning", "Battery temperature elevated"));
  }

  if (speedKph > 125) {
    alerts.push(createAlert(vehicleId, "SPEED_SPIKE", "warning", "High-speed event detected"));
  }

  if (healthScore < 55) {
    alerts.push(createAlert(vehicleId, "HEALTH_DEGRADED", "critical", "Vehicle health score degraded"));
  }

  return alerts;
}

function createAlert(
  vehicleId: string,
  code: string,
  severity: AlertSeverity,
  message: string
): TelemetryAlert {
  return {
    id: `${vehicleId}:${code}`,
    code,
    severity,
    message,
    status: "active"
  };
}

function calculateEfficiency(speedKph: number, powerKw: number) {
  if (speedKph < 8 || powerKw <= 0) {
    return 0;
  }

  return clamp((powerKw / speedKph) * 100, 12, 34);
}

function calculateRoadLoadKw(speedKph: number, mode: DriveMode) {
  if (mode === "parked" || mode === "charging") {
    return 0;
  }

  const rollingKw = 0.12 * speedKph;
  const aeroKw = 0.00042 * speedKph ** 3;
  const cityStopGoKw = mode === "city" ? 4 + Math.max(0, 55 - speedKph) * 0.08 : 0;
  return rollingKw + aeroKw + cityStopGoKw;
}

function calculateRangeKm(
  batteryPct: number,
  ratedRangeKm: number,
  efficiencyKwhPer100Km: number,
  stateOfCharge: VehicleTelemetry["stateOfCharge"]
) {
  const baseRange = (batteryPct / 100) * ratedRangeKm;
  if (stateOfCharge === "charging" || efficiencyKwhPer100Km === 0) {
    return baseRange;
  }

  const efficiencyFactor = clamp(18 / efficiencyKwhPer100Km, 0.72, 1.12);
  return baseRange * efficiencyFactor;
}

function targetSpeedForMode(mode: DriveMode, index: number) {
  switch (mode) {
    case "highway":
      return 94 + index * 4 + jitter(6);
    case "city":
      return 34 + index * 3 + jitter(8);
    case "charging":
      return 0;
    case "parked":
      return 0;
  }
}

function nextDriveMode(current: DriveMode): DriveMode {
  const modes: DriveMode[] = current === "charging" ? ["city", "parked"] : ["city", "highway", "parked"];
  return modes[Math.floor(Math.random() * modes.length)];
}

function approach(current: number, target: number, rate: number) {
  return current + (target - current) * rate;
}

function advanceLocation(state: VehicleState) {
  if (state.speedKph < 1) {
    return;
  }

  const distanceKm = state.speedKph / 3600;
  const headingRad = (state.headingDeg * Math.PI) / 180;
  state.lat += (Math.cos(headingRad) * distanceKm) / 111;
  state.lon += (Math.sin(headingRad) * distanceKm) / (111 * Math.cos((state.lat * Math.PI) / 180));
  state.headingDeg = (state.headingDeg + jitter(1.2) + 360) % 360;
}

function cloneState(state: VehicleState): VehicleState {
  return { ...state };
}
