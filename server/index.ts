import "dotenv/config";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { InfluxTelemetryWriter } from "./influx";
import {
  applyScenario,
  listSimulatorVehicles,
  nextTelemetry,
  validateTelemetryBatch,
  type AlertStatus,
  type ScenarioCommand,
  type TelemetryAlert,
  type VehicleTelemetry
} from "./telemetry";

const wsPort = Number(process.env.WS_PORT ?? 8080);
const apiPort = Number(process.env.API_PORT ?? 8090);
const maxHistoryPoints = 600;
const history = new Map<string, VehicleTelemetry[]>();
const latest = new Map<string, VehicleTelemetry>();
const alertStatuses = new Map<string, AlertStatus>();
const metrics = {
  startedAt: new Date().toISOString(),
  telemetryBatches: 0,
  telemetryMessagesSent: 0,
  failedInfluxWrites: 0,
  apiRequests: 0
};
const wss = new WebSocketServer({ port: wsPort });
const writer = new InfluxTelemetryWriter();

wss.on("connection", (socket) => {
  console.info("Dashboard client connected.");
  socket.send(
    JSON.stringify({
      type: "hello",
      message: "Connected to Sanchar telemetry stream"
    })
  );

  socket.on("close", () => {
    console.info("Dashboard client disconnected.");
  });

  socket.on("message", (rawMessage) => {
    handleSocketCommand(String(rawMessage), socket);
  });
});

const interval = setInterval(() => {
  const vehicles = nextTelemetry().map(applyAlertLifecycle);
  if (!validateTelemetryBatch(vehicles)) {
    console.warn("Telemetry validation failed; dropping generated batch.");
    return;
  }
  metrics.telemetryBatches += 1;

  for (const vehicle of vehicles) {
    latest.set(vehicle.vehicleId, vehicle);
    history.set(vehicle.vehicleId, [...(history.get(vehicle.vehicleId) ?? []), vehicle].slice(-maxHistoryPoints));
  }

  const payload = {
    type: "telemetry",
    vehicles
  };
  const encoded = JSON.stringify(payload);

  writer.write(payload.vehicles);

  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(encoded);
      metrics.telemetryMessagesSent += 1;
    }
  }
}, 1000);

const heartbeat = setInterval(() => {
  const encoded = JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(encoded);
      client.ping();
    }
  }
}, 15000);

const apiServer = createServer((request, response) => {
  void handleApiRequest(request, response);
});

async function handleApiRequest(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse
) {
  metrics.apiRequests += 1;
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, { error: "unauthorized" }, 401);
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/health") {
    sendJson(response, { ok: true, wsClients: wss.clients.size, vehicles: latest.size });
    return;
  }

  if (url.pathname === "/metrics") {
    sendJson(response, {
      ...metrics,
      wsClients: wss.clients.size,
      vehiclesOnline: latest.size
    });
    return;
  }

  if (url.pathname === "/api/fleet/summary") {
    sendJson(response, buildFleetSummary());
    return;
  }

  if (url.pathname === "/api/simulator") {
    sendJson(response, listSimulatorVehicles());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/simulator/scenario") {
    const body = await readJsonBody<{ vehicleId?: string; scenario?: ScenarioCommand }>(request);
    if (!body.vehicleId || !body.scenario) {
      sendJson(response, { error: "vehicleId and scenario are required" }, 400);
      return;
    }

    const applied = applyScenario(body.vehicleId, body.scenario);
    sendJson(response, applied ? { ok: true } : { error: "vehicle not found" }, applied ? 200 : 404);
    return;
  }

  if (request.method === "POST" && parts[0] === "api" && parts[1] === "alerts" && parts[2]) {
    const status = parts[3] === "resolve" ? "resolved" : parts[3] === "acknowledge" ? "acknowledged" : undefined;
    if (!status) {
      sendJson(response, { error: "unknown alert action" }, 404);
      return;
    }

    alertStatuses.set(decodeURIComponent(parts[2]), status);
    sendJson(response, { ok: true, alertId: decodeURIComponent(parts[2]), status });
    return;
  }

  if (url.pathname === "/api/vehicles") {
    sendJson(response, Array.from(latest.values()));
    return;
  }

  if (parts[0] === "api" && parts[1] === "vehicles" && parts[2]) {
    const vehicleId = parts[2];

    if (parts[3] === "latest") {
      const vehicle = latest.get(vehicleId);
      sendJson(response, vehicle ?? { error: "vehicle not found" }, vehicle ? 200 : 404);
      return;
    }

    if (parts[3] === "history") {
      const range = url.searchParams.get("range");
      if (range) {
        try {
          const influxRows = await writer.queryHistory(vehicleId, range);
          if (influxRows) {
            sendJson(response, influxRows);
            return;
          }
        } catch (error) {
          metrics.failedInfluxWrites += 1;
          console.warn("InfluxDB history query failed; using in-memory history.", error);
        }
      }

      const limit = Number(url.searchParams.get("limit") ?? 120);
      sendJson(response, (history.get(vehicleId) ?? []).slice(-Math.min(limit, maxHistoryPoints)));
      return;
    }
  }

  sendJson(response, { error: "not found" }, 404);
}

apiServer.listen(apiPort, () => {
  console.info(`Sanchar telemetry API listening on http://localhost:${apiPort}`);
});

async function shutdown() {
  clearInterval(interval);
  clearInterval(heartbeat);
  apiServer.close();
  wss.close();
  await writer.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function sendJson(response: import("node:http").ServerResponse, body: unknown, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function handleSocketCommand(rawMessage: string, socket: import("ws").WebSocket) {
  try {
    const message = JSON.parse(rawMessage) as
      | { type: "scenario"; vehicleId?: string; scenario?: ScenarioCommand }
      | { type: "alert"; alertId?: string; action?: "acknowledge" | "resolve" };

    if (message.type === "scenario" && message.vehicleId && message.scenario) {
      const applied = applyScenario(message.vehicleId, message.scenario);
      socket.send(
        JSON.stringify({
          type: "command-result",
          command: "scenario",
          ok: applied,
          vehicleId: message.vehicleId,
          scenario: message.scenario,
          message: applied ? "Scenario applied" : "Vehicle not found"
        })
      );
      return;
    }

    if (message.type === "alert" && message.alertId && message.action) {
      const status: AlertStatus = message.action === "resolve" ? "resolved" : "acknowledged";
      alertStatuses.set(message.alertId, status);
      socket.send(
        JSON.stringify({
          type: "command-result",
          command: "alert",
          ok: true,
          alertId: message.alertId,
          status
        })
      );
      return;
    }

    socket.send(JSON.stringify({ type: "command-result", ok: false, message: "Unknown command" }));
  } catch {
    socket.send(JSON.stringify({ type: "command-result", ok: false, message: "Invalid command JSON" }));
  }
}

function applyAlertLifecycle(vehicle: VehicleTelemetry): VehicleTelemetry {
  const alerts = vehicle.alerts
    .map((alert): TelemetryAlert => ({
      ...alert,
      status: alertStatuses.get(alert.id) ?? "active"
    }))
    .filter((alert) => alert.status !== "resolved");

  return { ...vehicle, alerts };
}

function buildFleetSummary() {
  const vehicles = Array.from(latest.values());
  const alerts = vehicles.flatMap((vehicle) => vehicle.alerts);

  return {
    onlineVehicles: vehicles.length,
    averageBatteryPct: average(vehicles.map((vehicle) => vehicle.batteryPct)),
    averageHealthScore: average(vehicles.map((vehicle) => vehicle.healthScore)),
    activeCriticalAlerts: alerts.filter((alert) => alert.status === "active" && alert.severity === "critical").length,
    fleetEnergyKw: Number(vehicles.reduce((sum, vehicle) => sum + Math.max(0, vehicle.powerKw), 0).toFixed(1))
  };
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function isAuthorized(request: import("node:http").IncomingMessage) {
  const token = process.env.API_TOKEN;
  if (!token) {
    return true;
  }

  return request.headers.authorization === `Bearer ${token}`;
}

async function readJsonBody<T>(request: import("node:http").IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

console.info(`Sanchar telemetry WebSocket server listening on ws://localhost:${wsPort}`);
