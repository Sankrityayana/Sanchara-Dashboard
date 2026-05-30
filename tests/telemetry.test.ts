import assert from "node:assert/strict";
import test from "node:test";
import { calculateHealthScore, nextTelemetry, validateTelemetryBatch } from "../server/telemetry";

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
