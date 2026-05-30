# Project Overview

Sanchar Dashboard is a real-time electric vehicle telemetry dashboard. It simulates a small EV fleet, streams telemetry to a browser dashboard over WebSockets, visualizes vehicle state live, and supports scenario controls for demoing failure modes.

## Goal

The goal is to show understanding of real-time systems used in vehicle, energy, and fleet software:

- continuous telemetry ingestion
- live frontend visualization
- stateful backend simulation
- diagnostics and alerting
- time-series persistence
- deployable full-stack architecture

## Target Roles

This project is positioned for:

- Vehicle Software Intern
- Energy Software Intern
- Full-stack Intern
- Real-time Systems Intern
- Telemetry/Data Platform Intern

## Core User Story

A user opens the dashboard and sees three EVs streaming live data. The user can select a vehicle, inspect speed, battery, power, temperature, range, health, alerts, and map location. The user can trigger scenarios like low battery or overheating and immediately see how the system reacts.

## Main Features

- live fleet telemetry
- coherent vehicle simulation
- health score calculation
- alert generation
- local vehicle tracking
- scenario controls
- trend charts
- vehicle comparison
- route/map visualization
- optional InfluxDB persistence
- REST API and WebSocket command API

## Current Scope

This is an MVP plus hardening project. It is suitable for portfolio use and technical discussion. It is not connected to real vehicle hardware or CAN bus data.

## Non-Goals

The project does not currently implement:

- real vehicle data ingestion
- user authentication UI
- production-grade fleet tenancy
- full cloud deployment automation
- map provider integration
- long-term persistent alert storage
