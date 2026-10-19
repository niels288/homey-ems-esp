const { capabilityFor, flattenValues, homeyValue } = require("./capabilities");

const TIMEOUT_MS = 10_000;

/** Read-only client for one EMS-ESP gateway's REST API (firmware 3.7 or newer). */
class Gateway {
	constructor(host) {
		this.host = host;
	}

	/** The EMS device types on the bus, one entry per type (the API addresses devices by type). */
	async emsDevices() {
		const system = await this.#get("system");
		const byType = new Map();
		for (const device of system.devices ?? []) {
			if (!byType.has(device.type))
				byType.set(device.type, { type: device.type, name: device.name });
		}
		return [...byType.values()];
	}

	/**
	 * The capabilities one EMS device offers, from a single `/entities` request.
	 * @returns {Promise<{ id: string, key: string, options: object }[]>}
	 */
	async discover(type) {
		const entities = await this.#get(`${type}/entities`);
		// Before 3.7 `/entities` maps each key to its name in a list; the per-entity fallback crashed a 3.6.3 gateway.
		// A starting gateway has not detected its devices yet; syncing that would delete every capability and its Insights.
		if (Object.keys(entities).length === 0)
			throw new Error(`EMS-ESP has no ${type} entities yet`);
		if (Object.values(entities).some(Array.isArray)) {
			throw new Error("EMS-ESP 3.7 or newer is required");
		}
		return Object.entries(entities).flatMap(([key, meta]) => {
			const capability = capabilityFor(key, meta);
			return capability ? [{ ...capability, key }] : [];
		});
	}

	/** Current values for the discovered capabilities; entities without a usable value are left out. */
	async readings(type, capabilities) {
		const raw = flattenValues(await this.#get(`${type}/values`));
		return capabilities
			.map((capability) => ({
				id: capability.id,
				value: homeyValue(capability, raw[capability.key]),
			}))
			.filter(({ value }) => value !== null);
	}

	async #get(path) {
		const res = await fetch(`http://${this.host}/api/${path}`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`EMS-ESP ${path}: HTTP ${res.status}`);
		return res.json();
	}
}

module.exports = { Gateway };
