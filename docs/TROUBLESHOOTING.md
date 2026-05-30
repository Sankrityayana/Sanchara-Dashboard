# Troubleshooting

## Frontend Loads But No Vehicle Data

Cause: backend WebSocket server is not running.

Fix:

```bash
npm run dev
```

Do not run only:

```bash
npm run client
```

`npm run client` starts only the React app.

## Scenario Controls Do Nothing

Try:

1. Select a vehicle first.
2. Hard refresh the browser.
3. Stop the dev server.
4. Restart:

```bash
npm run dev
```

The UI applies scenarios locally, so you should see immediate changes even before backend acknowledgement.

## `ERR_CONNECTION_REFUSED localhost:8090`

The REST API is not running. The live dashboard uses WebSockets for the main demo, so this should not block basic telemetry.

Start backend:

```bash
npm run dev
```

## WebSocket Connection Failed

Check that the backend is listening on `8080`.

```bash
netstat -ano | findstr 8080
```

Then restart:

```bash
npm run dev
```

## InfluxDB Not Writing

Check `.env`:

```text
INFLUX_URL=
INFLUX_TOKEN=
INFLUX_ORG=
INFLUX_BUCKET=
```

If any value is missing, the app intentionally skips InfluxDB persistence.

## Browser Shows Old UI

Cause: Vite/browser cache or old dev server.

Fix:

1. Stop the dev server.
2. Restart `npm run dev`.
3. Hard refresh the browser.

## Port Already In Use

Another process is using `5173`, `8080`, or `8090`.

Stop the old process or change the port with environment variables:

```text
WS_PORT=8081
API_PORT=8091
```
