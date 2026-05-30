import type { FleetSummary, ScenarioCommand, VehicleTelemetry } from "../types";

export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8090";

export async function fetchFleetSummary() {
  return getJson<FleetSummary>("/api/fleet/summary");
}

export async function fetchVehicleHistory(vehicleId: string, range: string) {
  return getJson<VehicleTelemetry[]>(`/api/vehicles/${vehicleId}/history?range=${range}`);
}

export async function acknowledgeAlert(alertId: string) {
  return postJson(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`);
}

export async function resolveAlert(alertId: string) {
  return postJson(`/api/alerts/${encodeURIComponent(alertId)}/resolve`);
}

export async function applyScenario(vehicleId: string, scenario: ScenarioCommand) {
  return postJson("/api/simulator/scenario", { vehicleId, scenario });
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function postJson(path: string, body?: unknown) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(`POST ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}
