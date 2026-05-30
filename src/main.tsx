import React from "react";
import ReactDOM from "react-dom/client";
import { Activity, BatteryCharging, Gauge, Radio, Thermometer, Zap } from "lucide-react";
import type { VehicleTelemetry, TelemetryMessage } from "./types";
import "./styles.css";

const wsUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";
const maxHistoryPoints = 36;

function App() {
  const [vehicles, setVehicles] = React.useState<Record<string, VehicleTelemetry>>({});
  const [history, setHistory] = React.useState<Record<string, VehicleTelemetry[]>>({});
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>();
  const [connectionState, setConnectionState] = React.useState<"connecting" | "live" | "offline">(
    "connecting"
  );
  const [lastUpdated, setLastUpdated] = React.useState<string>();

  React.useEffect(() => {
    let reconnectTimer: number | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      setConnectionState("connecting");
      socket = new WebSocket(wsUrl);

      socket.addEventListener("open", () => setConnectionState("live"));
      socket.addEventListener("close", () => {
        setConnectionState("offline");
        reconnectTimer = window.setTimeout(connect, 2500);
      });
      socket.addEventListener("error", () => {
        socket?.close();
      });
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data) as TelemetryMessage;
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
        setLastUpdated(new Date().toLocaleTimeString());
      });
    };

    connect();

    return () => {
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  const vehicleList = Object.values(vehicles).sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));
  const selectedVehicle = selectedVehicleId ? vehicles[selectedVehicleId] : vehicleList[0];
  const selectedHistory = selectedVehicle ? history[selectedVehicle.vehicleId] ?? [] : [];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Sanchar Dashboard</p>
          <h1>Live vehicle telemetry</h1>
        </div>
        <div className={`connection-pill ${connectionState}`}>
          <Radio size={18} />
          <span>{connectionState}</span>
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
        <MetricCard icon={<Activity />} label="Vehicles online" value={vehicleList.length.toString()} />
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
                <small>{vehicle.stateOfCharge}</small>
              </span>
              <span className="vehicle-speed">{vehicle.speedKph.toFixed(0)} kph</span>
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
                <MetricCard icon={<Zap />} label="Power" value={`${selectedVehicle.powerKw} kW`} />
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
              </div>

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
                  <dt>Latitude</dt>
                  <dd>{selectedVehicle.location.lat}</dd>
                </div>
                <div>
                  <dt>Longitude</dt>
                  <dd>{selectedVehicle.location.lon}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="empty-state">Waiting for telemetry stream...</div>
          )}
        </section>
      </section>
    </main>
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
