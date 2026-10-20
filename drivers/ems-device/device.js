const Homey = require("homey");
const { Gateway } = require("../../lib/gateway");
const { isDiscovered } = require("../../lib/capabilities");
const { windowCop } = require("../../lib/cop");

const RETRY_DISCOVERY_MS = 60_000;

module.exports = class EmsDevice extends Homey.Device {
	#timer = null;
	#listening = new Set();
	// Each (re)start bumps the run; an older poll still in flight then stops instead of rescheduling.
	#run = 0;

	async onInit() {
		await this.#start(this.getSettings());
	}

	async onSettings({ newSettings }) {
		// Not awaited: Homey saves the new settings only after onSettings returns.
		this.#start(newSettings).catch(this.error);
	}

	/** Every value this device's gateway offers, marked whether the user shows it. */
	async valueChoices() {
		const hidden = new Set(this.#hidden());
		const choices = await new Gateway(this.getSetting("host")).choices(
			this.getData().type,
		);
		return choices.map((choice) => ({
			...choice,
			// A windowed COP's value lives here, not on the gateway.
			value:
				choice.value ??
				(this.hasCapability(choice.id)
					? this.getCapabilityValue(choice.id)
					: null),
			shown: !hidden.has(choice.key),
		}));
	}

	/** Hides these entity keys, shows the rest; a hidden value's capability (and its Insights) is removed. */
	async hideValues(keys) {
		await this.setStoreValue("hidden", keys);
		await this.#start(this.getSettings());
	}

	// Hidden rather than shown keys are stored, so entities a firmware update adds appear on their own.
	#hidden() {
		return this.getStoreValue("hidden") ?? [];
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
			const hidden = new Set(this.#hidden());
			capabilities = (await gateway.discover(type)).filter(
				({ key }) => !hidden.has(key),
			);
			capabilities = await this.#syncCapabilities(capabilities);
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

	/** Makes the device's capabilities match discovery; returns the ones it has, leaving out any Homey refused. */
	async #syncCapabilities(capabilities) {
		const wanted = new Set(capabilities.map(({ id }) => id));
		for (const id of this.getCapabilities()) {
			if (isDiscovered(id) && !wanted.has(id)) await this.removeCapability(id);
		}
		const synced = [];
		for (const capability of capabilities) {
			// One capability Homey refuses must not take the device's other values down with it.
			try {
				await this.#syncCapability(capability);
				synced.push(capability);
			} catch (err) {
				this.error(`${capability.id}: ${err.message}`);
			}
		}
		return synced;
	}

	async #syncCapability({ id, key, options }) {
		if (!this.hasCapability(id)) await this.addCapability(id);
		if (id.startsWith("ems_switch.") && !this.#listening.has(id)) {
			this.#listening.add(id);
			this.registerCapabilityListener(id, (value) => this.#write(key, value));
		}
		// Titles follow the gateway's language setting, which can change after pairing.
		if (this.getCapabilityOptions(id).title?.en !== options.title.en) {
			await this.setCapabilityOptions(id, options);
		}
	}

	// Host and token are read at write time: either may have changed in the settings since discovery.
	async #write(key, value) {
		const gateway = new Gateway(this.getSetting("host"));
		try {
			await gateway.write(
				this.getData().type,
				key,
				value,
				this.getSetting("token"),
			);
		} catch (err) {
			throw err.code === "token"
				? new Error(this.homey.__("errors.token"))
				: err;
		}
	}

	// Counter samples go in the store, so a restart does not cost a day of waiting.
	async #windowed({ id, energy }, capabilities) {
		const { cop } = capabilities.find((capability) => capability.id === id);
		const stored = this.getStoreValue(`samples.${id}`) ?? [];
		const { samples, value } = windowCop(
			stored,
			Date.now(),
			energy,
			cop.windowMs,
		);
		// About once an hour, not on every poll.
		if (samples.at(-1)?.t !== stored.at(-1)?.t) {
			await this.setStoreValue(`samples.${id}`, samples);
		}
		return { id, value };
	}

	async #update(gateway, type, capabilities) {
		try {
			const readings = await Promise.all(
				(await gateway.readings(type, capabilities)).map((reading) =>
					reading.energy ? this.#windowed(reading, capabilities) : reading,
				),
			);
			await Promise.all(
				readings
					.filter(({ value }) => value !== null)
					.map(({ id, value }) => this.setCapabilityValue(id, value)),
			);
			await this.setAvailable();
		} catch (err) {
			await this.setUnavailable(err.message).catch(this.error);
		}
	}
};
