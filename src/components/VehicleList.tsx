import type { TrackedVehicle } from "../types";
import { healthClass } from "../lib/math";

export function VehicleList({
  trackedVehicles,
  selectedVehicleId,
  lastUpdated,
  now,
  onSelect
}: {
  trackedVehicles: TrackedVehicle[];
  selectedVehicleId?: string;
  lastUpdated?: string;
  now: number;
  onSelect: (vehicleId: string) => void;
}) {
  return (
    <aside className="vehicle-list" aria-label="Vehicles">
      <div className="panel-heading">
        <h2>Vehicles</h2>
        <span>{lastUpdated ? `Updated ${lastUpdated}` : "Waiting for stream"}</span>
      </div>
      <div className="vehicle-list-summary">
        <span>{trackedVehicles.filter((track) => track.online).length} online</span>
        <span>{trackedVehicles.filter((track) => !track.online).length} offline</span>
      </div>
      {trackedVehicles.map((track) => {
        const vehicle = track.vehicle;
        const secondsSinceSeen = Math.max(0, Math.floor((now - track.lastSeenAt) / 1000));
        return (
        <button
          className={`vehicle-row ${vehicle.vehicleId === selectedVehicleId ? "selected" : ""} ${
            track.online ? "online" : "offline"
          }`}
          key={vehicle.vehicleId}
          onClick={() => onSelect(vehicle.vehicleId)}
          type="button"
        >
          <span>
            <strong>{vehicle.vehicleId}</strong>
            <small>
              {track.online ? "online" : `offline ${secondsSinceSeen}s`} / {vehicle.scenario}
            </small>
            <small>
              {vehicle.driveMode} / {vehicle.stateOfCharge} / {track.sampleCount} samples
            </small>
          </span>
          <span className="vehicle-meta">
            <strong>{vehicle.speedKph.toFixed(0)} kph</strong>
            <small>{vehicle.batteryPct.toFixed(0)}% battery</small>
            <small className={healthClass(vehicle.healthScore)}>{vehicle.healthScore}/100 health</small>
          </span>
        </button>
        );
      })}
    </aside>
  );
}
