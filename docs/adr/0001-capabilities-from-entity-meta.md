# ADR 0001 — Capabilities are derived at runtime from EMS-ESP entity meta

- **Status:** accepted, 2026-10-19

## Context

EMS-ESP knows about 200 entities for a heat pump with a thermostat, and which
ones exist depends on the model and firmware. The existing community app
(angas/se.assermark.ems-esp) hard-codes a handful per model; the MQTT route
needs every value configured by hand.

Since 3.7, `GET /api/<device>/entities` returns every entity with its meta
(`type`, `uom`, `fullname`, `writeable`, `min`/`max`, `enum`). On 3.6 it
returns names only, and the meta is only available per entity. Probing a
3.6.3-dev.5 gateway (EnviLine, ESP32-S3) entity by entity restarted it twice,
both times on `GET /api/boiler/uptimecomppool`.

## Decision

- **EMS-ESP 3.7 or newer is required.** Discovery is one `/entities` request
  per EMS device; older firmware gets a clear error instead of a probe.
- Values always come from `/api/<device>/values`; nested circuits are keyed
  `hc1.seltemp`, the same way `/entities` keys them.
- Each entity maps to a sub-capability of a standard capability where Homey
  has one (`measure_temperature` for °C, `measure_power` for kW → W,
  `meter_power` for kWh), else of one of four generic app capabilities
  (`ems_number` with the unit as option, `ems_percent`, `ems_boolean`,
  `ems_text`). The title is the EMS-ESP `fullname`.
- Version 1 exposes **readings** only (`writeable: false`); the ~110 writeable
  settings would bury the useful values, and writing needs its own validation.
- Discovery runs on every device init and settings change, so entities from a
  firmware update appear and vanished ones are removed.

## Consequences

- No support for 3.6 and older; users update the gateway first (OTA in the
  EMS-ESP web UI).
- Homey Energy does not pick up sub-capabilities; a main `measure_power` /
  `meter_power` is a later, explicit choice.
