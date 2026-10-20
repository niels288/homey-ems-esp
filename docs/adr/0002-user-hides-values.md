# ADR 0002 — The user hides values; the device remembers the hidden ones

- **Status:** accepted, 2026-10-20

## Context

A heat pump yields about 119 readings; on an EnviLine some 35 never carry a
value (gas-burner fields, unused circuits). ADR 0001 keeps them, because
filtering on "has a value" automatically would let a starting gateway delete
capabilities and their Insights.

## Decision

- The **user** chooses, never an automatic filter: while pairing (a list after
  picking the EMS devices, preselected to the values that have a reading now),
  and afterwards through *Repair* or the app settings page.
- The device's store keeps the **hidden** entity keys, not the shown ones, so
  entities a firmware update adds still appear without user action.
- Pairing, repair and the settings page share one renderer
  (`drivers/ems-device/pair/values.html`, copied into `settings/index.html`;
  `test/views.test.js` keeps the copies equal).

## Consequences

- Hiding a value removes its capability, with its Insights history and the
  Flows using it; the list asks for confirmation before that.
- A device whose gateway does not answer is left out when the settings page
  saves, so its hidden values are not reset.
