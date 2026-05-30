export type VehicleState = "charging" | "driving" | "parked";
export type DriveMode = "city" | "highway" | "charging" | "parked";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export type TelemetryAlert = {
  id: string;
  code: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
};

export type FleetSummary = {
  onlineVehicles: number;
  averageBatteryPct: number;
  averageHealthScore: number;
  activeCriticalAlerts: number;
  fleetEnergyKw: number;
};

export type ScenarioCommand = "normal" | "low-battery" | "overheat" | "charging" | "offline";

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
  stateOfCharge: VehicleState;
  location: {
    lat: number;
    lon: number;
  };
};

export type TrackedVehicle = {
  vehicle: VehicleTelemetry;
  online: boolean;
  lastSeenAt: number;
  sampleCount: number;
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
    }
  | {
      type: "command-result";
      command?: "scenario" | "alert";
      ok: boolean;
      message?: string;
      vehicleId?: string;
      scenario?: ScenarioCommand;
      alertId?: string;
      status?: AlertStatus;
    };
