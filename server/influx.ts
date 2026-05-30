import { InfluxDB, Point, WriteApi } from "@influxdata/influxdb-client";
import type { VehicleTelemetry } from "./telemetry";

type InfluxConfig = {
  url: string;
  token: string;
  org: string;
  bucket: string;
};

export class InfluxTelemetryWriter {
  private writeApi?: WriteApi;
  private client?: InfluxDB;
  private config?: InfluxConfig;

  constructor() {
    const config = readInfluxConfig();
    if (!config) {
      console.info("InfluxDB not configured; telemetry will stream without persistence.");
      return;
    }

    this.config = config;
    this.client = new InfluxDB({
      url: config.url,
      token: config.token
    });
    this.writeApi = this.client.getWriteApi(config.org, config.bucket);

    console.info(`InfluxDB writer enabled for bucket "${config.bucket}".`);
  }

  write(batch: VehicleTelemetry[]) {
    if (!this.writeApi) {
      return;
    }

    for (const vehicle of batch) {
      const point = new Point("vehicle_telemetry")
        .tag("vehicleId", vehicle.vehicleId)
        .tag("stateOfCharge", vehicle.stateOfCharge)
        .floatField("speedKph", vehicle.speedKph)
        .floatField("batteryPct", vehicle.batteryPct)
        .floatField("batteryTempC", vehicle.batteryTempC)
        .floatField("cabinTempC", vehicle.cabinTempC)
        .floatField("motorTempC", vehicle.motorTempC)
        .floatField("rangeKm", vehicle.rangeKm)
        .floatField("odometerKm", vehicle.odometerKm)
        .floatField("powerKw", vehicle.powerKw)
        .floatField("efficiencyKwhPer100Km", vehicle.efficiencyKwhPer100Km)
        .intField("healthScore", vehicle.healthScore)
        .floatField("lat", vehicle.location.lat)
        .floatField("lon", vehicle.location.lon)
        .tag("driveMode", vehicle.driveMode)
        .timestamp(new Date(vehicle.timestamp));

      this.writeApi.writePoint(point);
    }
  }

  async close() {
    await this.writeApi?.close();
  }

  async queryHistory(vehicleId: string, range: string): Promise<VehicleTelemetry[] | undefined> {
    if (!this.client || !this.config) {
      return undefined;
    }

    const queryApi = this.client.getQueryApi(this.config.org);
    const flux = `
      from(bucket: "${this.config.bucket}")
        |> range(start: -${sanitizeRange(range)})
        |> filter(fn: (r) => r._measurement == "vehicle_telemetry")
        |> filter(fn: (r) => r.vehicleId == "${vehicleId.replace(/"/g, "")}")
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"])
    `;

    const rows: VehicleTelemetry[] = [];

    for await (const { values, tableMeta } of queryApi.iterateRows(flux)) {
      const row = tableMeta.toObject(values) as Record<string, unknown>;
      rows.push({
        vehicleId,
        timestamp: String(row._time),
        speedKph: numberValue(row.speedKph),
        batteryPct: numberValue(row.batteryPct),
        batteryTempC: numberValue(row.batteryTempC),
        cabinTempC: numberValue(row.cabinTempC),
        motorTempC: numberValue(row.motorTempC),
        rangeKm: numberValue(row.rangeKm),
        odometerKm: numberValue(row.odometerKm),
        powerKw: numberValue(row.powerKw),
        efficiencyKwhPer100Km: numberValue(row.efficiencyKwhPer100Km),
        healthScore: numberValue(row.healthScore),
        driveMode: String(row.driveMode ?? "city") as VehicleTelemetry["driveMode"],
        scenario: "normal",
        alerts: [],
        stateOfCharge: String(row.stateOfCharge ?? "driving") as VehicleTelemetry["stateOfCharge"],
        location: {
          lat: numberValue(row.lat),
          lon: numberValue(row.lon)
        }
      });
    }

    return rows;
  }
}

function sanitizeRange(range: string) {
  return /^\d+[smhd]$/.test(range) ? range : "5m";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readInfluxConfig(): InfluxConfig | undefined {
  const { INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET } = process.env;
  if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
    return undefined;
  }

  return {
    url: INFLUX_URL,
    token: INFLUX_TOKEN,
    org: INFLUX_ORG,
    bucket: INFLUX_BUCKET
  };
}
