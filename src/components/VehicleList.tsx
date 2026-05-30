import type { VehicleTelemetry } from "../types";
import { healthClass } from "../lib/math";

export function VehicleList({
  vehicles,
  selectedVehicleId,
  lastUpdated,
  onSelect
}: {
  vehicles: VehicleTelemetry[];
  selectedVehicleId?: string;
  lastUpdated?: string;
  onSelect: (vehicleId: string) => void;
}) {
  return (
    <aside className="vehicle-list" aria-label="Vehicles">
      <div className="panel-heading">
        <h2>Vehicles</h2>
        <span>{lastUpdated ? `Updated ${lastUpdated}` : "Waiting for stream"}</span>
      </div>
      {vehicles.map((vehicle) => (
        <button
          className={`vehicle-row ${vehicle.vehicleId === selectedVehicleId ? "selected" : ""}`}
          key={vehicle.vehicleId}
          onClick={() => onSelect(vehicle.vehicleId)}
          type="button"
        >
          <span>
            <strong>{vehicle.vehicleId}</strong>
            <small>
              {vehicle.driveMode} / {vehicle.stateOfCharge}
            </small>
          </span>
          <span className="vehicle-meta">
            <strong>{vehicle.speedKph.toFixed(0)} kph</strong>
            <small className={healthClass(vehicle.healthScore)}>{vehicle.healthScore}/100</small>
          </span>
        </button>
      ))}
    </aside>
  );
}
