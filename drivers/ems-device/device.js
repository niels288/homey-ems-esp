const Homey = require("homey");
const { Gateway } = require("../../lib/gateway");
const { isDiscovered } = require("../../lib/capabilities");

const RETRY_DISCOVERY_MS = 60_000;

module.exports = class EmsDevice extends Homey.Device {
	#timer = null;
	// Each (re)start bumps the run; an older poll still in flight then stops instead of rescheduling.
	#run = 0;

	async onInit() {
		await this.#start(this.getSettings());
	}

	async onSettings({ newSettings }) {
		// Not awaited: Homey saves the new settings only after onSettings returns.
		this.#start(newSettings).catch(this.error);
	}

	async onDeleted() {
		this.#run++;
		this.homey.clearTimeout(this.#timer);
	}

	async #start({ host, poll_interval }) {
		const run = ++this.#run;
		this.homey.clearTimeout(this.#timer);
		const gateway = new Gateway(host);
		const { type } = this.getData();
		let capabilities;
		try {
			capabilities = await gateway.discover(type);
			await this.#syncCapabilities(capabilities);
		} catch (err) {
			if (run !== this.#run) return;
			await this.setUnavailable(err.message).catch(this.error);
			this.#timer = this.homey.setTimeout(
				() => this.#start(this.getSettings()).catch(this.error),
				RETRY_DISCOVERY_MS,
			);
			return;
		}
		if (run !== this.#run) return;
		this.log(`${type}: ${capabilities.length} capabilities`);
		const poll = async () => {
			await this.#update(gateway, type, capabilities);
			if (run !== this.#run) return;
			this.#timer = this.homey.setTimeout(poll, poll_interval * 1000);
		};
		await poll();
	}

	async #syncCapabilities(capabilities) {
		const wanted = new Set(capabilities.map(({ id }) => id));
		for (const id of this.getCapabilities()) {
			if (isDiscovered(id) && !wanted.has(id)) await this.removeCapability(id);
		}
		for (const { id, options } of capabilities) {
			if (!this.hasCapability(id)) await this.addCapability(id);
			// Titles follow the gateway's language setting, which can change after pairing.
			if (this.getCapabilityOptions(id).title?.en !== options.title.en) {
				await this.setCapabilityOptions(id, options);
			}
		}
	}

	async #update(gateway, type, capabilities) {
		try {
			const readings = await gateway.readings(type, capabilities);
			await Promise.all(
				readings.map(({ id, value }) => this.setCapabilityValue(id, value)),
			);
			await this.setAvailable();
		} catch (err) {
			await this.setUnavailable(err.message).catch(this.error);
		}
	}
};
