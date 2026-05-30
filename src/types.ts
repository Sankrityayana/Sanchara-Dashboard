export type VehicleState = "charging" | "driving" | "parked";
export type DriveMode = "city" | "highway" | "charging" | "parked";
export type AlertSeverity = "info" | "warning" | "critical";

export type TelemetryAlert = {
  code: string;
  severity: AlertSeverity;
  message: string;
};

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
      type: "heartbeat";
      timestamp: string;
    }
  | {
      type: "telemetry";
      vehicles: VehicleTelemetry[];
    };
