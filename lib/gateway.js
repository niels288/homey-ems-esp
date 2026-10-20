const {
	capabilityFor,
	flattenValues,
	homeyValue,
	unitsOf,
} = require("./capabilities");
const { copCapabilities, energyOf, ratio } = require("./cop");

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
		const readingsOnly = Object.entries(entities).flatMap(([key, meta]) => {
			const capability = capabilityFor(key, meta);
			return capability ? [{ ...capability, key }] : [];
		});
		return [...readingsOnly, ...copCapabilities(entities)];
	}

	/**
	 * Current values for the discovered capabilities; entities without a usable value are left out.
	 * A COP over a time window has no value here: it carries the counters' `energy`, and the device, which keeps the history, works it out.
	 */
	async readings(type, capabilities) {
		const raw = flattenValues(await this.#get(`${type}/values`));
		return capabilities
			.map((capability) => readingOf(capability, raw))
			.filter(({ value, energy }) => value !== null || energy);
	}

	/**
	 * Every value one EMS device offers, as a user picks from them: its title, unit and current reading.
	 * @returns {Promise<{ key: string, title: string, units: string, value: number | boolean | string | null }[]>}
	 */
	async choices(type) {
		const capabilities = await this.discover(type);
		const readings = await this.readings(type, capabilities);
		const valueById = new Map(readings.map(({ id, value }) => [id, value]));
		return capabilities.map((capability) => ({
			id: capability.id,
			key: capability.key,
			title: capability.options.title.en,
			units: unitsOf(capability),
			value: valueById.get(capability.id) ?? null,
			// Has a value once the device has watched long enough, not at the first look.
			pending: Boolean(capability.cop?.windowMs),
		}));
	}

	async #get(path) {
		const res = await fetch(`http://${this.host}/api/${path}`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`EMS-ESP ${path}: HTTP ${res.status}`);
		return res.json();
	}
}

function readingOf(capability, raw) {
	const { id, cop } = capability;
	if (!cop) return { id, value: homeyValue(capability, raw[capability.key]) };
	const energy = energyOf(cop, raw);
	if (cop.windowMs)
		return energy ? { id, value: null, energy } : { id, value: null };
	return { id, value: energy && ratio(energy) };
}

module.exports = { Gateway };
