# ADR 0004 — Writing only through an allowlist of switches

- **Status:** accepted, 2026-10-20

## Context

Version 1 was read-only (ADR 0001). The first wish to change something is
extra hot water. The gateway's owner agreed to that one write. EMS-ESP offers
it twice: the boiler's `dhw.onetime` and the thermostat's `dhw.charge`. On an
EnviLine heat pump with an HMC310 only the thermostat's works: writing
`boiler/dhw.onetime` reached the bus (`UBAFlags`) and changed nothing, while
`thermostat/dhw.charge` started a charge within seconds and stopped it again
(2026-10-20, TRACE log). Home Connect does it the same way. EMS-ESP accepts writes with an API
access token (`Authorization: Bearer`), unless the owner disabled that check.

## Decision

- Writeable entities stay hidden, except `<device type>/<key>` pairs on an
  allowlist (`SWITCHES` in `lib/capabilities.js`, now only
  `thermostat/dhw.charge`) that are booleans. They become
  `ems_switch.*` capabilities: a toggle that shows the gateway's value and
  writes `POST /api/<device>/<circuit>/<name>` with `{ "value": … }`.
- The access token is a device setting (password field). A refused write
  (401/403) tells the user to enter it.
- Every new key on the allowlist is a Critical Change: the owner's go-ahead,
  then a test on the real installation.

## Consequences

- No generic writing of settings; each switch is a deliberate decision.
- Without a token a gateway that checks it refuses the switch; reading keeps
  working.
