import { AlertTriangle } from "lucide-react";
import type { TelemetryAlert } from "../types";

export function AlertPanel({
  alerts,
  onAcknowledge,
  onResolve
}: {
  alerts: Array<TelemetryAlert & { vehicleId: string }>;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}) {
  const visibleAlerts = alerts.slice(0, 6);

  return (
    <article className="insight-panel">
      <div className="panel-heading">
        <h3>Active alerts</h3>
        <span>{alerts.length} open</span>
      </div>
      {visibleAlerts.length ? (
        <div className="alert-list">
          {visibleAlerts.map((alert) => (
            <div className={`alert-row ${alert.severity}`} key={alert.id}>
              <AlertTriangle size={18} />
              <span>
                <strong>{alert.vehicleId}</strong>
                <small>
                  {alert.message} · {alert.status}
                </small>
              </span>
              <span className="alert-actions">
                {alert.status === "active" ? (
                  <button type="button" onClick={() => onAcknowledge(alert.id)}>
                    Ack
                  </button>
                ) : null}
                <button type="button" onClick={() => onResolve(alert.id)}>
                  Resolve
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="quiet-state">No active alerts</div>
      )}
    </article>
  );
}
