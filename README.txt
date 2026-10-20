Read your heat pump or boiler in Homey through an EMS-ESP gateway.

EMS-ESP is an open-source gateway (for example from BBQKees) that connects to the EMS bus of Bosch, Buderus, Nefit, Junkers and Worcester heat pumps and boilers. This app talks to the gateway directly over your local network: no MQTT broker and no manual mapping.

Enter the gateway's IP address and pick the devices on the bus, such as the heat pump and the thermostat. The app asks the gateway which values exist and adds them to Homey: temperatures, power, compressor state, energy counters and more. Values refresh every 30 seconds and can be used in Flows and Insights.

Value names follow the language set in the EMS-ESP web interface.

Requirements: EMS-ESP 3.7 or newer. This version only reads values; it never changes your heating settings.
