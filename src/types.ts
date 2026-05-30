export type VehicleState = "charging" | "driving" | "parked";

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
  stateOfCharge: VehicleState;
  location: {
    lat: number;
    lon: number;
  };
};

export type TelemetryMessage =
  | {
      type: "hello";
      message: string;
    }
  | {
      type: "telemetry";
      vehicles: VehicleTelemetry[];
    };
