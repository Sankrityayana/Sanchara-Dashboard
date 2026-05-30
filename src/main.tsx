import React from "react";
import ReactDOM from "react-dom/client";
import { BatteryCharging, Gauge, Radio, ShieldCheck, Thermometer } from "lucide-react";
import { AlertPanel } from "./components/AlertPanel";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { FleetMap } from "./components/FleetMap";
import { FleetSummaryStrip } from "./components/FleetSummaryStrip";
import { MetricCard } from "./components/MetricCard";
import { ScenarioControls } from "./components/ScenarioControls";
import { TrendChart } from "./components/TrendChart";
import { VehicleList } from "./components/VehicleList";
import {
  acknowledgeAlert,
  applyScenario,
  fetchFleetSummary,
  fetchVehicleHistory,
  resolveAlert
} from "./lib/api";
import type { FleetSummary, ScenarioCommand, TelemetryMessage, VehicleTelemetry } from "./types";
import "./styles.css";

const wsUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";
const maxHistoryPoints = 72;
const staleAfterMs = 7000;

function App() {
  const [vehicles, setVehicles] = React.useState<Record<string, VehicleTelemetry>>({});
  const [history, setHistory] = React.useState<Record<string, VehicleTelemetry[]>>({});
  const [apiHistory, setApiHistory] = React.useState<VehicleTelemetry[]>([]);
  const [historyRange, setHistoryRange] = React.useState("live");
  const [fleetSummary, setFleetSummary] = React.useState<FleetSummary>();
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

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      fetchFleetSummary().then(setFleetSummary).catch(() => undefined);
    }, 5000);

    fetchFleetSummary().then(setFleetSummary).catch(() => undefined);
    return () => window.clearInterval(interval);
  }, []);

  const vehicleList = Object.values(vehicles).sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));
  const selectedVehicle = selectedVehicleId ? vehicles[selectedVehicleId] : vehicleList[0];
  const compareVehicle =
    compareVehicleId && compareVehicleId !== selectedVehicle?.vehicleId
      ? vehicles[compareVehicleId]
      : vehicleList.find((vehicle) => vehicle.vehicleId !== selectedVehicle?.vehicleId);
  const selectedLiveHistory = selectedVehicle ? history[selectedVehicle.vehicleId] ?? [] : [];
  const selectedHistory = historyRange === "live" ? selectedLiveHistory : apiHistory;
  const routeHistory = selectedHistory.length ? selectedHistory : selectedLiveHistory;
  const fleetAlerts = vehicleList.flatMap((vehicle) =>
    vehicle.alerts.map((alert) => ({ ...alert, vehicleId: vehicle.vehicleId }))
  );
  const isStale = Boolean(lastMessageAt && now - lastMessageAt > staleAfterMs);
  const effectiveConnectionState = isStale ? "offline" : connectionState;

  React.useEffect(() => {
    if (!selectedVehicle || historyRange === "live") {
      setApiHistory([]);
      return;
    }

    fetchVehicleHistory(selectedVehicle.vehicleId, historyRange)
      .then(setApiHistory)
      .catch(() => setApiHistory([]));
  }, [selectedVehicle?.vehicleId, historyRange]);

  const handleAlertAction = (action: "acknowledge" | "resolve", alertId: string) => {
    const request = action === "acknowledge" ? acknowledgeAlert(alertId) : resolveAlert(alertId);
    request.catch(() => undefined);
  };

  const handleScenario = (scenario: ScenarioCommand) => {
    if (!selectedVehicle) {
      return;
    }

    applyScenario(selectedVehicle.vehicleId, scenario).catch(() => undefined);
  };

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

      <FleetSummaryStrip vehicles={vehicleList} summary={fleetSummary} />

      <section className="dashboard-grid">
        <VehicleList
          vehicles={vehicleList}
          selectedVehicleId={selectedVehicle?.vehicleId}
          lastUpdated={lastUpdated}
          onSelect={setSelectedVehicleId}
        />

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

              <div className="chart-toolbar">
                <h3>Telemetry history</h3>
                <select
                  aria-label="History range"
                  value={historyRange}
                  onChange={(event) => setHistoryRange(event.target.value)}
                >
                  <option value="live">Live memory</option>
                  <option value="5m">Last 5 min</option>
                  <option value="30m">Last 30 min</option>
                  <option value="1h">Last 1 hour</option>
                </select>
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
                <AlertPanel
                  alerts={fleetAlerts}
                  onAcknowledge={(alertId) => handleAlertAction("acknowledge", alertId)}
                  onResolve={(alertId) => handleAlertAction("resolve", alertId)}
                />
                <ComparisonPanel
                  vehicles={vehicleList}
                  primary={selectedVehicle}
                  compare={compareVehicle}
                  compareVehicleId={compareVehicle?.vehicleId}
                  onCompareVehicleChange={setCompareVehicleId}
                />
                <ScenarioControls selectedVehicle={selectedVehicle} onApply={handleScenario} />
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

              <FleetMap
                vehicles={vehicleList}
                selectedVehicleId={selectedVehicle.vehicleId}
                route={routeHistory}
              />
            </>
          ) : (
            <div className="empty-state">Waiting for telemetry stream...</div>
          )}
        </section>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
