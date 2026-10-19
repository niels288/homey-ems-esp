const Homey = require("homey");
const { Gateway } = require("../../lib/gateway");

module.exports = class EmsDriver extends Homey.Driver {
	async onPair(session) {
		let gateway;
		let emsDevices = [];

		session.setHandler("host", async (host) => {
			gateway = new Gateway(String(host).trim());
			emsDevices = await gateway.emsDevices();
			if (emsDevices.length === 0)
				throw new Error(this.homey.__("pair.no_devices"));
		});

		session.setHandler("list_devices", async () =>
			emsDevices.map(({ type }) => ({
				name: `EMS ${type}`,
				data: { id: `${gateway.host}/${type}`, type },
				settings: { host: gateway.host },
			})),
		);
	}
};
