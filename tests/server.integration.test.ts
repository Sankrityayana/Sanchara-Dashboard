import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { WebSocket } from "ws";

const wsPort = 19080 + Math.floor(Math.random() * 100);
const apiPort = wsPort + 1000;

test(
  "server exposes health, fleet summary, simulator controls, and websocket telemetry",
  { skip: process.platform === "win32" ? "Windows sandbox process spawning is unreliable for this integration test." : false },
  async (t) => {
  const server = await startServer();
  t.after(() => server.kill());

  const health = await getJson<{ ok: boolean; vehicles: number }>(`http://127.0.0.1:${apiPort}/health`);
  assert.equal(health.ok, true);
  assert.ok(health.vehicles > 0);

  const summary = await getJson<{ onlineVehicles: number; averageHealthScore: number }>(
    `http://127.0.0.1:${apiPort}/api/fleet/summary`
  );
  assert.ok(summary.onlineVehicles > 0);
  assert.ok(summary.averageHealthScore >= 0);

  const scenarioResponse = await fetch(`http://127.0.0.1:${apiPort}/api/simulator/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId: "SAN-001", scenario: "low-battery" })
  });
  assert.equal(scenarioResponse.ok, true);

  const message = await readTelemetryMessage();
  assert.equal(message.type, "telemetry");
  assert.ok(message.vehicles.some((vehicle) => vehicle.vehicleId === "SAN-001"));
  }
);

async function startServer() {
  let stderr = "";
  const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "server/index.ts"], {
    cwd: process.cwd(),
    env: testEnv(),
    stdio: ["ignore", "ignore", "pipe"],
    shell: process.platform === "win32"
  });
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const health = await getJson<{ vehicles: number }>(`http://127.0.0.1:${apiPort}/health`);
      if (health.vehicles > 0) {
        return child;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  child.kill();
  throw new Error(`server did not start ${stderr}`.trim());
}

function testEnv() {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (process.platform === "win32" && key.toUpperCase() === "PATH" && "Path" in env) {
      continue;
    }
    env[key] = value;
  }

  env.WS_PORT = String(wsPort);
  env.API_PORT = String(apiPort);
  return env;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function readTelemetryMessage(): Promise<{ type: string; vehicles: Array<{ vehicleId: string }> }> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${wsPort}`);
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("timed out waiting for telemetry"));
    }, 5000);

    socket.on("message", (message) => {
      const parsed = JSON.parse(String(message));
      if (parsed.type === "telemetry") {
        clearTimeout(timeout);
        socket.close();
        resolve(parsed);
      }
    });
    socket.on("error", reject);
  });
}
