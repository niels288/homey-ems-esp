# EMS-ESP for Homey

Homey Pro app for an [EMS-ESP](https://emsesp.org) gateway (e.g. BBQKees) on a
Bosch, Buderus, Nefit, Junkers or Worcester heat pump or boiler. Enter the
gateway's IP address; the app asks the gateway which values exist and creates
them in Homey. No MQTT broker, no manual mapping.

**Status:** in development, read-only. Developed with a Nefit EnviLine split
heat pump.

## Requirements

- Homey Pro
- EMS-ESP **3.7 or newer** (update through the EMS-ESP web interface)

## Install (development)

```bash
npm install -g homey
homey login
homey app run        # or: homey app install
```

Then in Homey: *Add device → EMS-ESP → gateway IP address*, and pick the EMS
devices (heat pump/boiler, thermostat) to add.

## Develop

```bash
npm test                         # unit tests, no Homey needed
npx biome check .                # lint + format
node scripts/discover.js <ip>    # what a gateway yields (2 requests per device)
```

Working agreements: [`AGENTS.md`](AGENTS.md). Design decisions: [`docs/adr`](docs/adr).

## License

MIT
