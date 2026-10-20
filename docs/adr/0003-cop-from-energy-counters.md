# ADR 0003 — COP from the heat pump's own energy counters

- **Status:** accepted, 2026-10-20

## Context

Users want the heat pump's coefficient of performance. EMS-ESP reports the
heat pump's own counters for supplied heat and consumed electricity (total,
heating, hot water, aux heater), in whole kWh. The instantaneous electrical
power (`hpcurrpower`) is empty on an EnviLine. An external kWh meter would
need the `homey:manager:api` permission to read another device.

## Decision

- COP comes from the gateway's counters only; no external meter.
- Lifetime COP (total, heating, hot water) is a derived capability
  (`ems_cop.*`), discovered when the device has both counters, and hidden or
  shown like any value (ADR 0002).
- Consumption includes the electric aux heater.
- A **24-hour COP** from the counters' increase: the device keeps hourly
  counter samples in its store (survives restarts) and has no value until the
  samples span 24 hours. A counter that goes down resets the samples.
- No instantaneous COP: whole-kWh counters make short windows noise.

## Consequences

- A heat pump without these counters gets no COP.
- The 24-hour COP shows *after 24 hours* in the value list until then.
