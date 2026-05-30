import "dotenv/config";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { InfluxTelemetryWriter } from "./influx";
import { nextTelemetry, validateTelemetryBatch, type VehicleTelemetry } from "./telemetry";

const wsPort = Number(process.env.WS_PORT ?? 8080);
const apiPort = Number(process.env.API_PORT ?? 8090);
const maxHistoryPoints = 600;
const history = new Map<string, VehicleTelemetry[]>();
const latest = new Map<string, VehicleTelemetry>();
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
});

const interval = setInterval(() => {
  const vehicles = nextTelemetry();
  if (!validateTelemetryBatch(vehicles)) {
    console.warn("Telemetry validation failed; dropping generated batch.");
    return;
  }

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
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/health") {
    sendJson(response, { ok: true, wsClients: wss.clients.size, vehicles: latest.size });
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
      const limit = Number(url.searchParams.get("limit") ?? 120);
      sendJson(response, (history.get(vehicleId) ?? []).slice(-Math.min(limit, maxHistoryPoints)));
      return;
    }
  }

  sendJson(response, { error: "not found" }, 404);
});

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

console.info(`Sanchar telemetry WebSocket server listening on ws://localhost:${wsPort}`);
