import type { ScenarioCommand, VehicleTelemetry } from "../types";

const scenarios: Array<{ label: string; value: ScenarioCommand }> = [
  { label: "Normal", value: "normal" },
  { label: "Low battery", value: "low-battery" },
  { label: "Overheat", value: "overheat" },
  { label: "Charging", value: "charging" },
  { label: "Offline", value: "offline" }
];

export function ScenarioControls({
  selectedVehicle,
  onApply
}: {
  selectedVehicle: VehicleTelemetry;
  onApply: (scenario: ScenarioCommand) => void;
}) {
  return (
    <article className="insight-panel">
      <div className="panel-heading">
        <h3>Scenario controls</h3>
        <span>{selectedVehicle.vehicleId}</span>
      </div>
      <div className="scenario-buttons">
        {scenarios.map((scenario) => (
          <button key={scenario.value} type="button" onClick={() => onApply(scenario.value)}>
            {scenario.label}
          </button>
        ))}
      </div>
    </article>
  );
}
