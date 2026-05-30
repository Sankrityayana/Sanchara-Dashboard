import React from "react";
import ReactDOM from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Gauge,
  MapPin,
  Radio,
  ShieldCheck,
  Thermometer,
  Zap
} from "lucide-react";
import type { VehicleTelemetry, TelemetryMessage } from "./types";
import "./styles.css";

const wsUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";
const maxHistoryPoints = 36;
const staleAfterMs = 7000;

function App() {
  const [vehicles, setVehicles] = React.useState<Record<string, VehicleTelemetry>>({});
  const [history, setHistory] = React.useState<Record<string, VehicleTelemetry[]>>({});
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>();
  const [compareVehicleId, setCompareVehicleId] = React.useState<string>();
  const [connectionState, setConnectionState] = React.useState<"connecting" | "live" | "offline">(
    "connecting"
  );
  const [retryAttempt, setRetryAttempt] = React.useState(0);
  const [lastUpdated, setLastUpdated] = React.useState<string>();
  const [lastMessageAt, setLastMessageAt] = React.useState<number>();
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    let reconnectTimer: number | undefined;
    let socket: WebSocket | undefined;
    let attempts = 0;

    const connect = () => {
      setConnectionState("connecting");
      socket = new WebSocket(wsUrl);

      socket.addEventListener("open", () => {
        attempts = 0;
        setRetryAttempt(0);
        setConnectionState("live");
      });
      socket.addEventListener("close", () => {
        setConnectionState("offline");
        attempts += 1;
        setRetryAttempt(attempts);
        reconnectTimer = window.setTimeout(connect, Math.min(30000, 1000 * 2 ** attempts));
      });
      socket.addEventListener("error", () => {
        socket?.close();
      });
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data) as TelemetryMessage;
        setLastMessageAt(Date.now());

        if (data.type === "heartbeat") {
          return;
        }

        if (data.type !== "telemetry") {
          return;
        }

        setVehicles((current) => {
          const next = { ...current };
          for (const vehicle of data.vehicles) {
            next[vehicle.vehicleId] = vehicle;
          }
          return next;
        });

        setHistory((current) => {
          const next = { ...current };
          for (const vehicle of data.vehicles) {
            next[vehicle.vehicleId] = [...(next[vehicle.vehicleId] ?? []), vehicle].slice(
              -maxHistoryPoints
            );
          }
          return next;
        });

        setSelectedVehicleId((current) => current ?? data.vehicles[0]?.vehicleId);
        setCompareVehicleId((current) => current ?? data.vehicles[1]?.vehicleId);
        setLastUpdated(new Date().toLocaleTimeString());
      });
    };

    connect();

    return () => {
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const vehicleList = Object.values(vehicles).sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));
  const selectedVehicle = selectedVehicleId ? vehicles[selectedVehicleId] : vehicleList[0];
  const compareVehicle =
    compareVehicleId && compareVehicleId !== selectedVehicle?.vehicleId
      ? vehicles[compareVehicleId]
      : vehicleList.find((vehicle) => vehicle.vehicleId !== selectedVehicle?.vehicleId);
  const selectedHistory = selectedVehicle ? history[selectedVehicle.vehicleId] ?? [] : [];
  const fleetAlerts = vehicleList.flatMap((vehicle) =>
    vehicle.alerts.map((alert) => ({ ...alert, vehicleId: vehicle.vehicleId }))
  );
  const isStale = Boolean(lastMessageAt && now - lastMessageAt > staleAfterMs);
  const effectiveConnectionState = isStale ? "offline" : connectionState;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Sanchar Dashboard</p>
          <h1>Live vehicle telemetry</h1>
        </div>
        <div className={`connection-pill ${effectiveConnectionState}`}>
          <Radio size={18} />
          <span>
            {isStale
              ? "stale"
              : retryAttempt > 0
                ? `retrying ${retryAttempt}`
                : effectiveConnectionState}
          </span>
        </div>
      </header>

      <section className="status-strip" aria-label="Fleet summary">
        <MetricCard
          icon={<Gauge />}
          label="Fleet avg speed"
          value={`${average(vehicleList.map((vehicle) => vehicle.speedKph)).toFixed(1)} kph`}
        />
        <MetricCard
          icon={<BatteryCharging />}
          label="Fleet avg battery"
          value={`${average(vehicleList.map((vehicle) => vehicle.batteryPct)).toFixed(1)}%`}
        />
        <MetricCard
          icon={<Thermometer />}
          label="Max motor temp"
          value={`${max(vehicleList.map((vehicle) => vehicle.motorTempC)).toFixed(1)} C`}
        />
        <MetricCard
          icon={<ShieldCheck />}
          label="Fleet health"
          value={`${average(vehicleList.map((vehicle) => vehicle.healthScore)).toFixed(0)} / 100`}
        />
      </section>

      <section className="dashboard-grid">
        <aside className="vehicle-list" aria-label="Vehicles">
          <div className="panel-heading">
            <h2>Vehicles</h2>
            <span>{lastUpdated ? `Updated ${lastUpdated}` : "Waiting for stream"}</span>
          </div>
          {vehicleList.map((vehicle) => (
            <button
              className={`vehicle-row ${
                vehicle.vehicleId === selectedVehicle?.vehicleId ? "selected" : ""
              }`}
              key={vehicle.vehicleId}
              onClick={() => setSelectedVehicleId(vehicle.vehicleId)}
              type="button"
            >
              <span>
                <strong>{vehicle.vehicleId}</strong>
                <small>
                  {vehicle.driveMode} · {vehicle.stateOfCharge}
                </small>
              </span>
              <span className="vehicle-meta">
                <strong>{vehicle.speedKph.toFixed(0)} kph</strong>
                <small className={healthClass(vehicle.healthScore)}>{vehicle.healthScore}/100</small>
              </span>
            </button>
          ))}
        </aside>

        <section className="primary-panel" aria-label="Selected vehicle telemetry">
          {selectedVehicle ? (
            <>
              <div className="vehicle-header">
                <div>
                  <p className="eyebrow">Selected vehicle</p>
                  <h2>{selectedVehicle.vehicleId}</h2>
                </div>
                <span className={`state-badge ${selectedVehicle.stateOfCharge}`}>
                  {selectedVehicle.stateOfCharge}
                </span>
              </div>

              <div className="telemetry-cards">
                <MetricCard icon={<Gauge />} label="Speed" value={`${selectedVehicle.speedKph} kph`} />
                <MetricCard
                  icon={<BatteryCharging />}
                  label="Battery"
                  value={`${selectedVehicle.batteryPct}%`}
                />
                <MetricCard
                  icon={<Thermometer />}
                  label="Motor temp"
                  value={`${selectedVehicle.motorTempC} C`}
                />
                <MetricCard
                  icon={<ShieldCheck />}
                  label="Health score"
                  value={`${selectedVehicle.healthScore} / 100`}
                />
              </div>

              <div className="chart-grid">
                <TrendChart
                  title="Speed trend"
                  data={selectedHistory.map((point) => point.speedKph)}
                  unit="kph"
                  color="#14b8a6"
                />
                <TrendChart
                  title="Battery trend"
                  data={selectedHistory.map((point) => point.batteryPct)}
                  unit="%"
                  color="#f59e0b"
                />
                <TrendChart
                  title="Motor thermal trend"
                  data={selectedHistory.map((point) => point.motorTempC)}
                  unit="C"
                  color="#ef4444"
                />
                <TrendChart
                  title="Efficiency trend"
                  data={selectedHistory.map((point) => point.efficiencyKwhPer100Km)}
                  unit="kWh/100 km"
                  color="#6366f1"
                />
              </div>

              <section className="insight-grid" aria-label="Alerts and comparison">
                <AlertPanel alerts={fleetAlerts} />
                <ComparisonPanel
                  vehicles={vehicleList}
                  primary={selectedVehicle}
                  compare={compareVehicle}
                  compareVehicleId={compareVehicle?.vehicleId}
                  onCompareVehicleChange={setCompareVehicleId}
                />
              </section>

              <dl className="detail-grid">
                <div>
                  <dt>Range</dt>
                  <dd>{selectedVehicle.rangeKm} km</dd>
                </div>
                <div>
                  <dt>Cabin temp</dt>
                  <dd>{selectedVehicle.cabinTempC} C</dd>
                </div>
                <div>
                  <dt>Battery temp</dt>
                  <dd>{selectedVehicle.batteryTempC} C</dd>
                </div>
                <div>
                  <dt>Odometer</dt>
                  <dd>{selectedVehicle.odometerKm.toLocaleString()} km</dd>
                </div>
                <div>
                  <dt>Power</dt>
                  <dd>{selectedVehicle.powerKw} kW</dd>
                </div>
                <div>
                  <dt>Efficiency</dt>
                  <dd>{selectedVehicle.efficiencyKwhPer100Km} kWh/100 km</dd>
                </div>
                <div>
                  <dt>Latitude</dt>
                  <dd>{selectedVehicle.location.lat}</dd>
                </div>
                <div>
                  <dt>Longitude</dt>
                  <dd>{selectedVehicle.location.lon}</dd>
                </div>
              </dl>

              <FleetMap vehicles={vehicleList} selectedVehicleId={selectedVehicle.vehicleId} />
            </>
          ) : (
            <div className="empty-state">Waiting for telemetry stream...</div>
          )}
        </section>
      </section>
    </main>
  );
}

function AlertPanel({
  alerts
}: {
  alerts: Array<{ vehicleId: string; code: string; severity: string; message: string }>;
}) {
  const visibleAlerts = alerts.slice(0, 5);

  return (
    <article className="insight-panel">
      <div className="panel-heading">
        <h3>Active alerts</h3>
        <span>{alerts.length} open</span>
      </div>
      {visibleAlerts.length ? (
        <div className="alert-list">
          {visibleAlerts.map((alert) => (
            <div className={`alert-row ${alert.severity}`} key={`${alert.vehicleId}-${alert.code}`}>
              <AlertTriangle size={18} />
              <span>
                <strong>{alert.vehicleId}</strong>
                <small>{alert.message}</small>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="quiet-state">No active alerts</div>
      )}
    </article>
  );
}

function ComparisonPanel({
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

function FleetMap({
  vehicles,
  selectedVehicleId
}: {
  vehicles: VehicleTelemetry[];
  selectedVehicleId: string;
}) {
  const lats = vehicles.map((vehicle) => vehicle.location.lat);
  const lons = vehicles.map((vehicle) => vehicle.location.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return (
    <section className="map-panel" aria-label="Fleet location overview">
      <div className="panel-heading">
        <h3>Fleet location</h3>
        <span>Mock GPS</span>
      </div>
      <div className="map-canvas">
        {vehicles.map((vehicle) => {
          const x = 8 + ((vehicle.location.lon - minLon) / Math.max(maxLon - minLon, 0.0001)) * 84;
          const y = 8 + ((maxLat - vehicle.location.lat) / Math.max(maxLat - minLat, 0.0001)) * 84;
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

function MetricCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TrendChart({
  title,
  data,
  unit,
  color
}: {
  title: string;
  data: number[];
  unit: string;
  color: string;
}) {
  const width = 520;
  const height = 180;
  const padding = 18;
  const minValue = Math.min(...data, 0);
  const maxValue = Math.max(...data, 1);
  const range = Math.max(maxValue - minValue, 1);
  const points = data
    .map((value, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const latest = data.at(-1) ?? 0;

  return (
    <article className="trend-panel">
      <div className="panel-heading">
        <h3>{title}</h3>
        <span>
          {latest.toFixed(1)} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <polyline className="chart-gridline" points={`0,${height - padding} ${width},${height - padding}`} />
        <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeWidth="4" />
      </svg>
    </article>
  );
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function max(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return Math.max(...values);
}

function healthClass(score: number) {
  if (score < 60) {
    return "critical";
  }
  if (score < 78) {
    return "warning";
  }
  return "healthy";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
