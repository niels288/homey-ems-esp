const Homey = require("homey");
const { Gateway } = require("../../lib/gateway");

// Pairing and repair share the "values" view: `values` lists each device's choices, `save` takes the hidden keys per device id.
module.exports = class EmsDriver extends Homey.Driver {
	async onPair(session) {
		let gateway;
		let emsDevices = [];
		let selected = [];

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

		session.setHandler("list_devices_selection", async (devices) => {
			selected = devices;
		});

		// Nothing exists yet, so the proposal is every value that has a reading now.
		session.setHandler("values", async () =>
			Promise.all(
				selected.map(async (device) => ({
					id: device.data.id,
					name: device.name,
					paired: false,
					choices: (await gateway.choices(device.data.type)).map((choice) => ({
						...choice,
						shown: choice.value !== null,
					})),
				})),
			),
		);

		session.setHandler("save", async (hiddenById) =>
			selected.map((device) => ({
				...device,
				store: { hidden: hiddenById[device.data.id] ?? [] },
			})),
		);
	}

	async onRepair(session, device) {
		const id = device.getData().id;

		session.setHandler("values", async () => [
			{
				id,
				name: device.getName(),
				paired: true,
				choices: await device.valueChoices(),
			},
		]);

		session.setHandler("save", async (hiddenById) => {
			await device.hideValues(hiddenById[id] ?? []);
			return [];
		});
	}
};
