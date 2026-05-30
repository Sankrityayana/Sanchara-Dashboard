# Testing Guide

The project uses TypeScript checks, Node tests, and production build validation.

## Commands

```bash
npm run typecheck
npm test
npm run build
```

## Typecheck

```bash
npm run typecheck
```

Runs TypeScript with `--noEmit`.

This catches:

- invalid types
- missing fields
- API contract mismatches
- frontend/backend model drift

## Unit Tests

```bash
npm test
```

Current tests cover:

- generated telemetry batch validity
- health score degradation
- scenario consistency
- WebSocket/API integration in CI-compatible environments

## Scenario Consistency Test

The scenario test verifies:

- low battery produces low range, degraded health, and low-battery alert
- charging produces zero speed and negative power
- overheat produces high temperature and thermal/health alerts
- normal resets to healthy values

## Build

```bash
npm run build
```

Runs typecheck and Vite production build.

## Windows Sandbox Note

The WebSocket/API integration test is skipped in the local Windows sandbox because process spawning is unreliable there. It is intended to run in CI/Linux environments.
