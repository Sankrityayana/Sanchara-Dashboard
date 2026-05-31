# Resume Notes

## Project

Sanchar Dashboard - Real-Time EV Telemetry Dashboard

## Tech Stack

React, TypeScript, Vite, Node.js, WebSockets, InfluxDB, Docker, GitHub Actions, Vercel, Render

## ATS-Friendly Resume Bullets

- Engineered a real-time EV telemetry dashboard streaming WebSocket data for 3 simulated vehicles with live speed, battery, temperature, range, health, and alert tracking.

- Built 5 vehicle scenario workflows for low battery, overheating, charging, offline, and recovery states to validate real-time telemetry and fault-monitoring behavior.

- Deployed a cloud-ready full-stack system with React, TypeScript, Node.js, REST APIs, WebSockets, Docker support, CI checks, and optional InfluxDB persistence.

## Short Project Description

Built a real-time EV telemetry dashboard that simulates a 3-vehicle fleet, streams coherent telemetry over WebSockets, visualizes live fleet health, and supports scenario controls for vehicle failure modes.

## Interview Talking Points

- Why WebSockets are used for push-based telemetry instead of polling.
- How vehicle metrics are kept coherent across battery, speed, range, power, temperature, and health.
- How scenario controls help test failure modes in live systems.
- Why the backend serves REST and WebSocket traffic from one HTTP server for cloud deployment.
- How optional InfluxDB persistence extends live telemetry into historical analysis.
