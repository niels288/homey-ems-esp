# CONTEXT

| Term | Meaning |
|---|---|
| **Gateway** | The BBQKees EMS-ESP board on the heating bus, reached over HTTP. |
| **EMS device** | A device on the bus as EMS-ESP groups it: `boiler` (also heat pumps such as the EnviLine, product 172), `thermostat`, `mixer`, … One Homey device per EMS device. |
| **Entity** | One value of an EMS device, e.g. `curflowtemp` or `hc1.seltemp`. Identified by its **key**: the short name, prefixed with the circuit (`hc1.`, `dhw.`) where it has one. |
| **Meta** | What EMS-ESP says about an entity: `type`, `uom`, `fullname`, `writeable`, `min`/`max`, `enum`. Comes with every entity in `GET /api/<device>/entities` (EMS-ESP 3.7+). |
| **Reading** | An entity that is not `writeable`. Everything the app exposes is a reading, except the switches. |
| **Discovery** | Turning the entity list plus meta into Homey capabilities; runs on device init, so new firmware entities appear without re-pairing. |
| **Hidden value** | An entity the user chose not to show; its key is kept in the device store, and discovery skips it (ADR 0002). |
| **COP** | Coefficient of performance: heat supplied ÷ electricity consumed (aux heater included), from the gateway's own counters (ADR 0003). |
| **Switch** | A writeable on/off entity Homey may change, from an allowlist per device type (now only the thermostat's `dhw.charge`); needs the gateway's access token (ADR 0004). |
| **Overview** | The dashboard widget drawing the installation with live values, from the devices' capabilities (ADR 0005). |
