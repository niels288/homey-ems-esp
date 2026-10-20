const { overview } = require("../../lib/overview");

const LABELS = [
	"outdoor_unit",
	"indoor_unit",
	"outdoor_sensor",
	"condenser",
	"element",
	"valve",
	"cylinder",
	"buffer",
	"pump",
	"distributor",
	"thermostat",
	"flow",
	"return",
	"target_flow",
	"compressor_off",
];

module.exports = {
	async getOverview({ homey }) {
		const byType = {};
		// shortcut: one installation per Homey; with two gateways the first device of each type wins. Add a widget setting then.
		for (const device of homey.drivers.getDriver("ems-device").getDevices()) {
			const { type } = device.getData();
			if (byType[type]) continue;
			byType[type] = Object.fromEntries(
				device
					.getCapabilities()
					.map((id) => [id, device.getCapabilityValue(id)]),
			);
		}
		return {
			...overview(byType, homey.i18n.getLanguage()),
			labels: Object.fromEntries(
				LABELS.map((label) => [label, homey.__(`overview.${label}`)]),
			),
		};
	},
};
