// Web API for settings/index.html; same answers as the pairing session's `values` and `save`.
const devicesOf = (homey) => homey.drivers.getDriver("ems-device").getDevices();

module.exports = {
	async getDevices({ homey }) {
		return Promise.all(
			devicesOf(homey).map(async (device) => {
				const answer = {
					id: device.getData().id,
					name: device.getName(),
					paired: true,
				};
				// One unreachable gateway must not hide every other device's values.
				try {
					return { ...answer, choices: await device.valueChoices() };
				} catch (err) {
					return { ...answer, choices: [], error: err.message };
				}
			}),
		);
	},

	async setHidden({ homey, body }) {
		for (const device of devicesOf(homey)) {
			const hidden = body[device.getData().id];
			if (Array.isArray(hidden)) await device.hideValues(hidden);
		}
		return [];
	},
};
