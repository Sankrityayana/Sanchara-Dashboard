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
  stateOfCharge: "charging" | "driving" | "parked";
  location: {
    lat: number;
    lon: number;
  };
};

const vehicleIds = ["SAN-001", "SAN-002", "SAN-003"];

type VehicleState = {
  vehicleId: string;
  speedKph: number;
  batteryPct: number;
  odometerKm: number;
  lat: number;
  lon: number;
};

const states = vehicleIds.map((vehicleId, index) => ({
  vehicleId,
  speedKph: 42 + index * 12,
  batteryPct: 88 - index * 9,
  odometerKm: 18000 + index * 2350,
  lat: 37.3947 + index * 0.012,
  lon: -122.1503 - index * 0.011
}));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const jitter = (amount: number) => (Math.random() - 0.5) * amount;

export function nextTelemetry(): VehicleTelemetry[] {
  return states.map((state, index) => nextVehicleTelemetry(state, index));
}

function nextVehicleTelemetry(state: VehicleState, index: number): VehicleTelemetry {
  const acceleration = jitter(16);
  state.speedKph = clamp(state.speedKph + acceleration, 0, 138);

  const isCharging = state.speedKph < 4 && Math.random() > 0.72;
  const stateOfCharge = isCharging
    ? "charging"
    : state.speedKph < 6
      ? "parked"
      : "driving";

  const batteryDelta =
    stateOfCharge === "charging" ? Math.random() * 0.08 : -(state.speedKph / 10000);
  state.batteryPct = clamp(state.batteryPct + batteryDelta, 10, 100);
  state.odometerKm += state.speedKph / 3600;
  state.lat += jitter(0.0005);
  state.lon += jitter(0.0005);

  const loadFactor = state.speedKph / 140;
  const batteryTempC = 27 + loadFactor * 14 + jitter(2.8);
  const motorTempC = 38 + loadFactor * 32 + jitter(6);
  const cabinTempC = 21 + Math.sin(Date.now() / 60000 + index) * 2 + jitter(0.8);
  const powerKw =
    stateOfCharge === "charging" ? -48 - Math.random() * 42 : loadFactor * 190 + jitter(18);

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
    stateOfCharge,
    location: {
      lat: Number(state.lat.toFixed(5)),
      lon: Number(state.lon.toFixed(5))
    }
  };
}
