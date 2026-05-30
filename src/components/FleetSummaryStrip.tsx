import { BatteryCharging, Gauge, ShieldCheck, Thermometer } from "lucide-react";
import type { FleetSummary, VehicleTelemetry } from "../types";
import { average, max } from "../lib/math";
import { MetricCard } from "./MetricCard";

export function FleetSummaryStrip({
  vehicles,
  summary
}: {
  vehicles: VehicleTelemetry[];
  summary?: FleetSummary;
}) {
  return (
    <section className="status-strip" aria-label="Fleet summary">
      <MetricCard
        icon={<Gauge />}
        label="Fleet avg speed"
        value={`${average(vehicles.map((vehicle) => vehicle.speedKph)).toFixed(1)} kph`}
      />
      <MetricCard
        icon={<BatteryCharging />}
        label="Fleet avg battery"
        value={`${(summary?.averageBatteryPct ?? average(vehicles.map((vehicle) => vehicle.batteryPct))).toFixed(1)}%`}
      />
      <MetricCard
        icon={<Thermometer />}
        label="Max motor temp"
        value={`${max(vehicles.map((vehicle) => vehicle.motorTempC)).toFixed(1)} C`}
      />
      <MetricCard
        icon={<ShieldCheck />}
        label="Fleet health"
        value={`${(summary?.averageHealthScore ?? average(vehicles.map((vehicle) => vehicle.healthScore))).toFixed(0)} / 100`}
      />
    </section>
  );
}
