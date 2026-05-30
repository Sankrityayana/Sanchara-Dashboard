import type { VehicleTelemetry } from "../types";

export function ComparisonPanel({
  vehicles,
  primary,
  compare,
  compareVehicleId,
  onCompareVehicleChange
}: {
  vehicles: VehicleTelemetry[];
  primary: VehicleTelemetry;
  compare?: VehicleTelemetry;
  compareVehicleId?: string;
  onCompareVehicleChange: (vehicleId: string) => void;
}) {
  return (
    <article className="insight-panel">
      <div className="panel-heading">
        <h3>Compare vehicles</h3>
        <select
          aria-label="Vehicle to compare"
          value={compareVehicleId ?? ""}
          onChange={(event) => onCompareVehicleChange(event.target.value)}
        >
          {vehicles
            .filter((vehicle) => vehicle.vehicleId !== primary.vehicleId)
            .map((vehicle) => (
              <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                {vehicle.vehicleId}
              </option>
            ))}
        </select>
      </div>
      {compare ? (
        <div className="compare-table">
          <CompareRow label="Speed" primary={`${primary.speedKph} kph`} compare={`${compare.speedKph} kph`} />
          <CompareRow label="Battery" primary={`${primary.batteryPct}%`} compare={`${compare.batteryPct}%`} />
          <CompareRow label="Health" primary={`${primary.healthScore}`} compare={`${compare.healthScore}`} />
          <CompareRow
            label="Efficiency"
            primary={`${primary.efficiencyKwhPer100Km}`}
            compare={`${compare.efficiencyKwhPer100Km}`}
          />
        </div>
      ) : (
        <div className="quiet-state">Need another vehicle to compare</div>
      )}
    </article>
  );
}

function CompareRow({ label, primary, compare }: { label: string; primary: string; compare: string }) {
  return (
    <div className="compare-row">
      <span>{label}</span>
      <strong>{primary}</strong>
      <strong>{compare}</strong>
    </div>
  );
}
