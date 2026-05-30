import assert from "node:assert/strict";
import test from "node:test";
import { applyScenario, calculateHealthScore, nextTelemetry, validateTelemetryBatch } from "../server/telemetry";

test("generated telemetry batches are valid", () => {
  const batch = nextTelemetry();

  assert.equal(validateTelemetryBatch(batch), true);
  assert.ok(batch.length >= 3);

  for (const vehicle of batch) {
    assert.ok(vehicle.vehicleId.startsWith("SAN-"));
    assert.ok(vehicle.batteryPct >= 0 && vehicle.batteryPct <= 100);
    assert.ok(vehicle.healthScore >= 0 && vehicle.healthScore <= 100);
    assert.ok(Number.isFinite(vehicle.efficiencyKwhPer100Km));
    for (const alert of vehicle.alerts) {
      assert.ok(alert.id.startsWith(`${vehicle.vehicleId}:`));
      assert.equal(alert.status, "active");
    }
  }
});

test("health score penalizes thermal and low battery conditions", () => {
  const healthy = calculateHealthScore({
    batteryPct: 82,
    batteryTempC: 31,
    motorTempC: 48,
    efficiencyKwhPer100Km: 18
  });

  const degraded = calculateHealthScore({
    batteryPct: 12,
    batteryTempC: 48,
    motorTempC: 89,
    efficiencyKwhPer100Km: 33
  });

  assert.ok(healthy > degraded);
  assert.ok(degraded < 70);
});

test("scenario telemetry values stay internally related", () => {
  applyScenario("SAN-001", "normal");
  applyScenario("SAN-001", "low-battery");
  const lowBattery = nextTelemetry().find((vehicle) => vehicle.vehicleId === "SAN-001");
  assert.ok(lowBattery);
  assert.ok(lowBattery.batteryPct <= 18);
  assert.ok(lowBattery.rangeKm < 120);
  assert.ok(lowBattery.healthScore < 70);
  assert.ok(lowBattery.alerts.some((alert) => alert.code === "LOW_BATTERY"));

  applyScenario("SAN-001", "charging");
  const charging = nextTelemetry().find((vehicle) => vehicle.vehicleId === "SAN-001");
  assert.ok(charging);
  assert.equal(charging.speedKph, 0);
  assert.ok(charging.powerKw < 0);
  assert.equal(charging.stateOfCharge, "charging");
  assert.ok(charging.efficiencyKwhPer100Km === 0);

  applyScenario("SAN-001", "overheat");
  const overheat = nextTelemetry().find((vehicle) => vehicle.vehicleId === "SAN-001");
  assert.ok(overheat);
  assert.ok(overheat.motorTempC > 80);
  assert.ok(overheat.healthScore < 80);
  assert.ok(overheat.alerts.some((alert) => alert.code.includes("TEMP") || alert.code === "HEALTH_DEGRADED"));

  applyScenario("SAN-001", "normal");
  const normal = nextTelemetry().find((vehicle) => vehicle.vehicleId === "SAN-001");
  assert.ok(normal);
  assert.ok(normal.batteryPct > 50);
  assert.ok(normal.healthScore > 80);
});
