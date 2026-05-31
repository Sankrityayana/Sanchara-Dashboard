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
import { fetchVehicleHistory } from "./lib/api";
import type {
  ScenarioCommand,
  TelemetryAlert,
  TelemetryMessage,
  TrackedVehicle,
  VehicleTelemetry
} from "./types";
import "./styles.css";

const wsUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:8090";
const maxHistoryPoints = 72;
const staleAfterMs = 7000;

function App() {
  const [vehicles, setVehicles] = React.useState<Record<string, VehicleTelemetry>>({});
  const [trackedVehicles, setTrackedVehicles] = React.useState<Record<string, TrackedVehicle>>({});
  const [history, setHistory] = React.useState<Record<string, VehicleTelemetry[]>>({});
  const [apiHistory, setApiHistory] = React.useState<VehicleTelemetry[]>([]);
  const [historyRange, setHistoryRange] = React.useState("live");
  const [scenarioStatus, setScenarioStatus] = React.useState<string>();
  const [scenarioOverrides, setScenarioOverrides] = React.useState<Record<string, ScenarioCommand>>({});
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>();
  const [compareVehicleId, setCompareVehicleId] = React.useState<string>();
  const [connectionState, setConnectionState] = React.useState<"connecting" | "live" | "offline">(
    "connecting"
  );
  const [retryAttempt, setRetryAttempt] = React.useState(0);
  const [lastUpdated, setLastUpdated] = React.useState<string>();
  const [lastMessageAt, setLastMessageAt] = React.useState<number>();
  const [now, setNow] = React.useState(Date.now());
  const socketRef = React.useRef<WebSocket | null>(null);
  const commandTimeoutRef = React.useRef<number | undefined>(undefined);
  const scenarioOverridesRef = React.useRef<Record<string, ScenarioCommand>>({});

  React.useEffect(() => {
    let connectTimer: number | undefined;
    let reconnectTimer: number | undefined;
    let socket: WebSocket | undefined;
    let attempts = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }

      setConnectionState("connecting");
      socket = new WebSocket(wsUrl);

      socket.addEventListener("open", () => {
        socketRef.current = socket ?? null;
        attempts = 0;
        setRetryAttempt(0);
        setConnectionState("live");
      });
      socket.addEventListener("close", () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        setConnectionState("offline");
        attempts += 1;
        setRetryAttempt(attempts);
        reconnectTimer = window.setTimeout(connect, Math.min(30000, 1000 * 2 ** attempts));
      });
      socket.addEventListener("error", () => {
        if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      });
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data) as TelemetryMessage;
        setLastMessageAt(Date.now());

        if (data.type === "command-result") {
          window.clearTimeout(commandTimeoutRef.current);
          if (data.command === "scenario") {
            setScenarioStatus(
              data.ok
                ? `${data.vehicleId} scenario set to ${data.scenario}. Live stream will keep updating it.`
                : (data.message ?? "Scenario failed.")
            );
          }
          return;
        }

        if (data.type !== "telemetry") {
          return;
        }

        const vehicles = data.vehicles
          .map(normalizeVehicle)
          .map((vehicle) => applyScenarioOverride(vehicle, scenarioOverridesRef.current[vehicle.vehicleId]))
          .filter((vehicle) => vehicle.scenario !== "offline")
          .map(enrichVehicleLocally);
        const seenAt = Date.now();

        setVehicles(() => {
          const next: Record<string, VehicleTelemetry> = {};
          for (const vehicle of vehicles) {
            next[vehicle.vehicleId] = vehicle;
          }
          return next;
        });

        setTrackedVehicles((current) => {
          const next: Record<string, TrackedVehicle> = {};
          for (const [vehicleId, track] of Object.entries(current)) {
            next[vehicleId] = {
              ...track,
              online: false
            };
          }
          for (const vehicle of vehicles) {
            const existing = current[vehicle.vehicleId];
            next[vehicle.vehicleId] = {
              vehicle,
              online: true,
              lastSeenAt: seenAt,
              sampleCount: (existing?.sampleCount ?? 0) + 1
            };
          }
          return next;
        });

        setHistory((current) => {
          const next = { ...current };
          for (const vehicle of vehicles) {
            next[vehicle.vehicleId] = [...(next[vehicle.vehicleId] ?? []), vehicle].slice(
              -maxHistoryPoints
            );
          }
          return next;
        });

        setSelectedVehicleId((current) => current ?? vehicles[0]?.vehicleId);
        setCompareVehicleId((current) => current ?? vehicles[1]?.vehicleId);
        setLastUpdated(new Date().toLocaleTimeString());
      });
    };

    connectTimer = window.setTimeout(connect, 100);

    return () => {
      disposed = true;
      window.clearTimeout(commandTimeoutRef.current);
      window.clearTimeout(connectTimer);
      window.clearTimeout(reconnectTimer);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const vehicleList = Object.values(vehicles).sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));
  const trackedVehicleList = Object.values(trackedVehicles).sort((a, b) => {
    if (a.online !== b.online) {
      return a.online ? -1 : 1;
    }
    return a.vehicle.vehicleId.localeCompare(b.vehicle.vehicleId);
  });
  const selectedTrack = selectedVehicleId ? trackedVehicles[selectedVehicleId] : trackedVehicleList[0];
  const selectedVehicle = selectedTrack?.vehicle ?? (selectedVehicleId ? vehicles[selectedVehicleId] : vehicleList[0]);
  const selectedVehicleStatus = selectedTrack && !selectedTrack.online ? "offline" : selectedVehicle?.stateOfCharge;
  const compareVehicle =
    compareVehicleId && compareVehicleId !== selectedVehicle?.vehicleId
      ? vehicles[compareVehicleId]
      : vehicleList.find((vehicle) => vehicle.vehicleId !== selectedVehicle?.vehicleId);
  const selectedLiveHistory = selectedVehicle ? history[selectedVehicle.vehicleId] ?? [] : [];
  const selectedHistory = historyRange === "live" ? selectedLiveHistory : apiHistory;
  const routeHistory = selectedHistory.length ? selectedHistory : selectedLiveHistory;
  const fleetAlerts = vehicleList.flatMap((vehicle) =>
    (vehicle.alerts ?? []).map((alert) => ({ ...alert, vehicleId: vehicle.vehicleId }))
  );
  const isStale = Boolean(lastMessageAt && now - lastMessageAt > staleAfterMs);
  const effectiveConnectionState = isStale ? "offline" : connectionState;

  React.useEffect(() => {
    if (trackedVehicleList.length && selectedVehicleId && !trackedVehicles[selectedVehicleId]) {
      setSelectedVehicleId(trackedVehicleList[0].vehicle.vehicleId);
    }
  }, [selectedVehicleId, trackedVehicleList, trackedVehicles]);

  React.useEffect(() => {
    if (!selectedVehicle || historyRange === "live" || connectionState !== "live") {
      setApiHistory([]);
      return;
    }

    fetchVehicleHistory(selectedVehicle.vehicleId, historyRange)
      .then(setApiHistory)
      .catch(() => setApiHistory([]));
  }, [selectedVehicle?.vehicleId, historyRange, connectionState]);

  const handleAlertAction = (action: "acknowledge" | "resolve", alertId: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setScenarioStatus("Telemetry stream is offline. Start the backend with npm run dev.");
      return;
    }

    socketRef.current.send(JSON.stringify({ type: "alert", alertId, action }));
  };

  const handleScenario = (scenario: ScenarioCommand) => {
    if (!selectedVehicle) {
      return;
    }

    const vehicleId = selectedVehicle.vehicleId;
    setScenarioOverrides((current) => {
      const next = { ...current };
      next[vehicleId] = scenario;
      scenarioOverridesRef.current = next;
      return next;
    });
    applyOptimisticScenario(selectedVehicle, scenario);
    setScenarioStatus(
      scenario === "offline"
        ? `${vehicleId} marked offline locally. Click Normal to bring it back.`
        : scenario === "normal"
          ? `${vehicleId} returned to normal local tracking.`
          : `${vehicleId} now showing ${scenario}. Click Normal to clear this scenario.`
    );
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "scenario", vehicleId, scenario }));
    }
    window.clearTimeout(commandTimeoutRef.current);
  };

  const applyOptimisticScenario = (vehicle: VehicleTelemetry, scenario: ScenarioCommand) => {
    if (scenario === "offline") {
      setVehicles((current) => {
        const next = { ...current };
        delete next[vehicle.vehicleId];
        return next;
      });
      setTrackedVehicles((current) => ({
        ...current,
        [vehicle.vehicleId]: {
          vehicle: buildScenarioPreview(vehicle, scenario),
          online: false,
          lastSeenAt: Date.now(),
          sampleCount: current[vehicle.vehicleId]?.sampleCount ?? 0
        }
      }));
      return;
    }

    const nextVehicle = buildScenarioPreview(vehicle, scenario);
    setVehicles((current) => ({
      ...current,
      [vehicle.vehicleId]: nextVehicle
    }));
    setTrackedVehicles((current) => ({
      ...current,
      [vehicle.vehicleId]: {
        vehicle: nextVehicle,
        online: true,
        lastSeenAt: Date.now(),
        sampleCount: current[vehicle.vehicleId]?.sampleCount ?? 0
      }
    }));
    setHistory((current) => ({
      ...current,
      [vehicle.vehicleId]: [...(current[vehicle.vehicleId] ?? []), nextVehicle].slice(-maxHistoryPoints)
    }));
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

      <FleetSummaryStrip vehicles={vehicleList} />

      <section className="dashboard-grid">
        <div className="sidebar-stack">
          <VehicleList
            trackedVehicles={trackedVehicleList}
            selectedVehicleId={selectedVehicle?.vehicleId}
            lastUpdated={lastUpdated}
            now={now}
            onSelect={setSelectedVehicleId}
          />
          {selectedVehicle ? (
            <ScenarioControls
              selectedVehicle={selectedVehicle}
              status={scenarioStatus}
              onApply={handleScenario}
            />
          ) : null}
        </div>

        <section className="primary-panel" aria-label="Selected vehicle telemetry">
          {selectedVehicle ? (
            <>
              <div className="vehicle-header">
                <div>
                  <p className="eyebrow">Selected vehicle</p>
                  <h2>{selectedVehicle.vehicleId}</h2>
                </div>
                <span className={`state-badge ${selectedVehicleStatus}`}>
                  {selectedVehicleStatus}
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

function normalizeVehicle(vehicle: VehicleTelemetry): VehicleTelemetry {
  return {
    ...vehicle,
    efficiencyKwhPer100Km: vehicle.efficiencyKwhPer100Km ?? 0,
    healthScore: vehicle.healthScore ?? 100,
    driveMode: vehicle.driveMode ?? "city",
    scenario: vehicle.scenario ?? "normal",
    alerts: vehicle.alerts ?? []
  };
}

function applyScenarioOverride(
  vehicle: VehicleTelemetry,
  scenario: ScenarioCommand | undefined
): VehicleTelemetry {
  if (!scenario) {
    return vehicle;
  }

  return buildScenarioPreview(vehicle, scenario);
}

function enrichVehicleLocally(vehicle: VehicleTelemetry): VehicleTelemetry {
  const alerts = [...(vehicle.alerts ?? [])];
  if (vehicle.batteryPct <= 18 && vehicle.stateOfCharge !== "charging" && !alerts.some((alert) => alert.code === "LOW_BATTERY")) {
    alerts.push(createPreviewAlert(vehicle.vehicleId, "LOW_BATTERY", "critical", "Battery below 18%"));
  }
  if (vehicle.motorTempC > 86 && !alerts.some((alert) => alert.code === "MOTOR_TEMP_CRITICAL")) {
    alerts.push(createPreviewAlert(vehicle.vehicleId, "MOTOR_TEMP_CRITICAL", "critical", "Motor temperature critical"));
  }
  if (vehicle.batteryTempC > 46 && !alerts.some((alert) => alert.code === "BATTERY_TEMP_WATCH")) {
    alerts.push(createPreviewAlert(vehicle.vehicleId, "BATTERY_TEMP_WATCH", "warning", "Battery temperature elevated"));
  }

  return {
    ...vehicle,
    healthScore: calculateClientHealthScore(vehicle),
    alerts
  };
}

function buildScenarioPreview(vehicle: VehicleTelemetry, scenario: ScenarioCommand): VehicleTelemetry {
  const base = {
    ...vehicle,
    scenario,
    timestamp: new Date().toISOString()
  };

  if (scenario === "normal") {
    return {
      ...base,
      speedKph: Math.max(base.speedKph, 42),
      batteryPct: Math.max(base.batteryPct, 65),
      batteryTempC: 31,
      motorTempC: 45,
      rangeKm: Math.max(base.rangeKm, 310),
      powerKw: 22,
      efficiencyKwhPer100Km: 18,
      healthScore: 95,
      driveMode: "city",
      stateOfCharge: "driving",
      alerts: []
    };
  }

  if (scenario === "low-battery") {
    return {
      ...base,
      batteryPct: 12,
      rangeKm: 58.8,
      healthScore: Math.min(base.healthScore, 60),
      alerts: [createPreviewAlert(vehicle.vehicleId, "LOW_BATTERY", "critical", "Battery below 18%")]
    };
  }

  if (scenario === "overheat") {
    return {
      ...base,
      motorTempC: 91,
      batteryTempC: Math.max(base.batteryTempC, 47),
      healthScore: Math.min(base.healthScore, 52),
      alerts: [
        createPreviewAlert(vehicle.vehicleId, "MOTOR_TEMP_CRITICAL", "critical", "Motor temperature critical"),
        createPreviewAlert(vehicle.vehicleId, "BATTERY_TEMP_WATCH", "warning", "Battery temperature elevated")
      ]
    };
  }

  if (scenario === "charging") {
    return {
      ...base,
      speedKph: 0,
      powerKw: -72,
      driveMode: "charging",
      stateOfCharge: "charging",
      alerts: []
    };
  }

  return base;
}

function createPreviewAlert(
  vehicleId: string,
  code: string,
  severity: TelemetryAlert["severity"],
  message: string
): TelemetryAlert {
  return {
    id: `${vehicleId}:${code}`,
    code,
    severity,
    message,
    status: "active"
  };
}

function calculateClientHealthScore(vehicle: VehicleTelemetry) {
  const batteryPenalty = vehicle.batteryPct < 20 ? (20 - vehicle.batteryPct) * 5 : 0;
  const batteryTempPenalty = Math.max(0, vehicle.batteryTempC - 42) * 2.2;
  const motorTempPenalty = Math.max(0, vehicle.motorTempC - 78) * 1.8;
  const efficiencyPenalty = Math.max(0, vehicle.efficiencyKwhPer100Km - 24) * 1.1;
  return Math.round(Math.min(100, Math.max(0, 100 - batteryPenalty - batteryTempPenalty - motorTempPenalty - efficiencyPenalty)));
}
