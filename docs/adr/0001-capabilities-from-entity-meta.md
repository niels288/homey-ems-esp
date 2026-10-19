# ADR 0001 — Capabilities are derived at runtime from EMS-ESP entity meta

- **Status:** accepted, 2026-10-19

## Context

EMS-ESP knows about 200 entities for a heat pump with a thermostat, and which
ones exist depends on the model and firmware. The existing community app
(angas/se.assermark.ems-esp) hard-codes a handful per model; the MQTT route
needs every value configured by hand.

On EMS-ESP 3.6.3, `/api/<device>/entities` returns names only. The meta
(`type`, `uom`, `writeable`, …) is only available per entity, and the `value`
in that per-entity answer can say `not set` while `/values` has a number. Some
entities answer HTTP 400 *with* a valid meta body.

## Decision

- Keys come from `/api/<device>/values` (heating circuits nested as `hcN`).
- Meta comes from `GET /api/<device>/<key>` per key, read even on HTTP 400.
- Values always come from `/values`, never from the per-entity answer.
- Each entity maps to a sub-capability of a standard capability where Homey
  has one (`measure_temperature` for °C, `measure_power` for kW → W,
  `meter_power` for kWh), else of one of four generic app capabilities
  (`ems_number` with the unit as option, `ems_percent`, `ems_boolean`,
  `ems_text`). The title is the EMS-ESP `fullname`.
- Version 1 exposes **readings** only (`writeable: false`); the 110 writeable
  settings would bury the useful values and writing needs its own validation.
- Discovery runs on device init and on settings change; capabilities that
  disappear are removed.

## Consequences

- Pairing is instant; the first init takes ~20 s (one request per entity).
- Homey Energy does not pick up sub-capabilities; a main `measure_power` /
  `meter_power` is a later, explicit choice.
