Read your heat pump or boiler in Homey through an EMS-ESP gateway.

EMS-ESP is an open-source gateway (for example from BBQKees) that connects to the EMS bus of Bosch, Buderus, Nefit, Junkers and Worcester heat pumps and boilers. This app talks to the gateway directly over your local network: no MQTT broker and no manual mapping.

Enter the gateway's IP address and pick the devices on the bus, such as the heat pump and the thermostat. The app asks the gateway which values exist and adds them to Homey: temperatures, power, compressor state, energy counters and more. Values refresh every 30 seconds and can be used in Flows and Insights.

Value names follow the language set in the EMS-ESP web interface.

The app only reads, with one exception: a switch for extra hot water on the thermostat device. Switching it needs the gateway's access token (EMS-ESP web interface → Settings → Security → Manage Users → key icon at an admin user), which you enter in the thermostat device's settings. The token is stored in those device settings on your Homey and is only sent to your EMS-ESP gateway on your local network, when you use the switch. Without a token the app reads values and changes nothing.

Requirements: EMS-ESP 3.7 or newer.
