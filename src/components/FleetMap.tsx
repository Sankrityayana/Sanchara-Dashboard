import { MapPin } from "lucide-react";
import type { VehicleTelemetry } from "../types";

export function FleetMap({
  vehicles,
  selectedVehicleId,
  route
}: {
  vehicles: VehicleTelemetry[];
  selectedVehicleId: string;
  route: VehicleTelemetry[];
}) {
  const lats = [...vehicles.map((vehicle) => vehicle.location.lat), ...route.map((point) => point.location.lat)];
  const lons = [...vehicles.map((vehicle) => vehicle.location.lon), ...route.map((point) => point.location.lon)];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const toPosition = (vehicle: VehicleTelemetry) => ({
    x: 8 + ((vehicle.location.lon - minLon) / Math.max(maxLon - minLon, 0.0001)) * 84,
    y: 8 + ((maxLat - vehicle.location.lat) / Math.max(maxLat - minLat, 0.0001)) * 84
  });

  const routePoints = route.map((point) => {
    const { x, y } = toPosition(point);
    return `${x},${y}`;
  });

  return (
    <section className="map-panel" aria-label="Fleet location overview">
      <div className="panel-heading">
        <h3>Fleet location</h3>
        <span>Route playback trail</span>
      </div>
      <div className="map-canvas">
        <svg className="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={routePoints.join(" ")} fill="none" stroke="#14b8a6" strokeWidth="1.2" />
        </svg>
        {vehicles.map((vehicle) => {
          const { x, y } = toPosition(vehicle);
          return (
            <div
              className={`map-marker ${vehicle.vehicleId === selectedVehicleId ? "selected" : ""}`}
              key={vehicle.vehicleId}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={vehicle.vehicleId}
            >
              <MapPin size={20} />
              <span>{vehicle.vehicleId}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
