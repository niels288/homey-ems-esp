# EMS-ESP for Homey

Homey Pro app for an [EMS-ESP](https://emsesp.org) gateway (e.g. BBQKees) on a
Bosch, Buderus, Nefit, Junkers or Worcester heat pump or boiler. Enter the
gateway's IP address; the app asks the gateway which values exist and creates
them in Homey. No MQTT broker, no manual mapping.

**Status:** reads values; the only thing it switches is extra hot water (on
the thermostat device), which needs the gateway's access token (device settings; EMS-ESP web
interface → Settings → Security → Manage Users → key icon). Developed with a Nefit EnviLine split
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
devices (heat pump/boiler, thermostat) to add, then which of their values to
show. Change that later through the device's *Repair* or the app's settings.

Value names come from the gateway, in its language. For Dutch (or German,
Swedish, …) names, set the language in the EMS-ESP web interface and restart
the app in Homey.

If `homey app install` fails with a bare `400`, run it from a computer on the
same network as the Homey: the install route through the Athom cloud failed
on a Homey Pro (Early 2023), the local one worked.

## Dashboard widget

*Heat pump overview* draws the installation (outdoor unit, condenser, electric
element, 3-way valve, hot water cylinder, buffer, floor heating, thermostat)
with live values from the devices. Needs Homey 12.3 or newer.

## Develop

```bash
npm test                         # unit tests, no Homey needed
npx biome check .                # lint + format
node scripts/discover.js <ip>    # what a gateway yields (2 requests per device)
```

Working agreements: [`AGENTS.md`](AGENTS.md). Design decisions: [`docs/adr`](docs/adr).

## License

MIT
