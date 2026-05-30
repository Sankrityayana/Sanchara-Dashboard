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

  constructor() {
    const config = readInfluxConfig();
    if (!config) {
      console.info("InfluxDB not configured; telemetry will stream without persistence.");
      return;
    }

    this.writeApi = new InfluxDB({
      url: config.url,
      token: config.token
    }).getWriteApi(config.org, config.bucket);

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
