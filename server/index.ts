import "dotenv/config";
import { WebSocketServer } from "ws";
import { InfluxTelemetryWriter } from "./influx";
import { nextTelemetry } from "./telemetry";

const port = Number(process.env.WS_PORT ?? 8080);
const wss = new WebSocketServer({ port });
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
  const payload = {
    type: "telemetry",
    vehicles: nextTelemetry()
  };
  const encoded = JSON.stringify(payload);

  writer.write(payload.vehicles);

  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(encoded);
    }
  }
}, 1000);

async function shutdown() {
  clearInterval(interval);
  wss.close();
  await writer.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.info(`Sanchar telemetry WebSocket server listening on ws://localhost:${port}`);
