# ADR 0005 — System overview as a dashboard widget, drawn from capability values

- **Status:** accepted, 2026-10-20

## Context

Users want a schematic of the installation with live values, as Home
Assistant dashboards show for EMS-ESP: outdoor unit, condenser, electric
element, 3-way valve, hot water cylinder, buffer, floor heating, thermostat.
A Homey device cannot show a custom picture; a dashboard widget (Homey 12.3+)
can.

## Decision

- One widget, `overview`, an inline SVG after the layout the gateway owner
  supplied. Live parts: the fan turns while the compressor runs, pumps and the
  element light up, the 3-way valve highlights the route to the cylinder or
  to the heating and dims the other.
- Values come from the app's devices' **capability values**, not from the
  gateway: no extra requests (ADR 0001), and a value the user hid (ADR 0002)
  stays out of the drawing too. `lib/overview.js` turns them into the texts
  and on/off states, formatted in Homey's language.
- The widget refreshes every 30 s, the default poll interval.
- One installation per Homey: with two gateways the first device of each type
  is drawn (a `shortcut:` in `widgets/overview/api.js`).

## Consequences

- The app needs Homey 12.3 or newer.
- Parts the installation does not report (the buffer) are drawn without a value.
