# Scenario Controls

Scenario controls are used to demo vehicle failure modes and state changes.

## Location In UI

Scenario controls appear below the vehicle list in the left sidebar.

Workflow:

1. Select a vehicle.
2. Click a scenario button.
3. The dashboard updates immediately.
4. The command is also sent to the backend through WebSocket.

## Supported Scenarios

### Normal

Restores the selected vehicle to a healthy local baseline.

Expected UI:

- healthy battery
- normal range
- normal motor/battery temperature
- normal health score
- no active alerts

### Low Battery

Forces low battery behavior.

Expected UI:

- battery drops to a low value
- range drops
- health score degrades
- `LOW_BATTERY` alert appears

### Overheat

Forces thermal stress.

Expected UI:

- motor temperature rises
- battery temperature rises
- health score degrades
- thermal alerts appear

### Charging

Forces charging state.

Expected UI:

- speed becomes `0`
- power becomes negative
- state becomes `charging`
- efficiency becomes `0`

### Offline

Marks vehicle offline in local tracking.

Expected UI:

- vehicle appears offline in the sidebar
- vehicle is removed from live fleet display
- last-seen timer continues increasing

## Why Local Overrides Exist

The UI applies scenarios locally first. This makes the demo responsive and avoids confusing behavior if:

- backend acknowledgement is delayed
- browser is connected to stale backend code
- WebSocket command is still in flight

The backend still receives the command when WebSocket is connected.

## Resetting A Vehicle

Click **Normal**. Normal is treated as a real local scenario, not just a clear operation, so the UI deterministically returns to a healthy baseline.

## Troubleshooting

If scenario buttons do not visibly change anything:

1. Hard refresh the browser.
2. Stop the dev server.
3. Start it again:

```bash
npm run dev
```

4. Select a vehicle before clicking scenarios.
