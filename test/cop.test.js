const test = require("node:test");
const assert = require("node:assert/strict");
const { copCapabilities, energyOf, ratio, windowCop } = require("../lib/cop");
const { flattenValues } = require("../lib/capabilities");

const entities = require("./fixtures/boiler-entities.json");
const raw = flattenValues(require("./fixtures/boiler-values.json"));
const HOUR = 3_600_000;
const byKey = Object.fromEntries(
	copCapabilities(entities).map((capability) => [capability.key, capability]),
);

test("a heat pump with energy counters gets total, heating, hot water and 24-hour COP", () => {
	assert.deepEqual(Object.keys(byKey), [
		"cop.total",
		"cop.heating",
		"cop.dhw",
		"cop.day",
	]);
	assert.equal(byKey["cop.total"].id, "ems_cop.total");
	assert.deepEqual(
		copCapabilities(require("./fixtures/thermostat-entities.json")),
		[],
	);
});

test("lifetime COP divides supplied heat by consumption including the aux heater", () => {
	// EnviLine fixture: 32513 / 8816, 24070 / (6364 + 43), 8435 / (2305 + 1).
	assert.equal(ratio(energyOf(byKey["cop.total"].cop, raw)), 3.69);
	assert.equal(ratio(energyOf(byKey["cop.heating"].cop, raw)), 3.76);
	assert.equal(ratio(energyOf(byKey["cop.dhw"].cop, raw)), 3.66);
});

test("a missing or unset main counter gives no COP instead of a wrong one", () => {
	const cop = byKey["cop.total"].cop;
	assert.equal(energyOf(cop, { ...raw, nrgconstotal: 4294967295 }), null);
	assert.equal(energyOf(cop, { nrgsupptotal: 10 }), null);
	assert.equal(ratio({ supplied: 5, consumed: 0 }), null);
});

test("24-hour COP waits for a full day of hourly samples, then uses the increase", () => {
	let samples = [];
	let value;
	for (let hour = 0; hour <= 24; hour++) {
		({ samples, value } = windowCop(
			samples,
			hour * HOUR,
			{ supplied: 1000 + hour * 4, consumed: 300 + hour },
			24 * HOUR,
		));
		if (hour < 24) assert.equal(value, null, `hour ${hour}`);
	}
	assert.equal(value, 4);
	({ samples, value } = windowCop(
		samples,
		24 * HOUR + 60_000,
		{ supplied: 1100, consumed: 325 },
		24 * HOUR,
	));
	assert.equal(samples.length, 25, "no sample within the hour");
	assert.equal(value, 4);
});

test("24-hour COP starts over when a counter goes down", () => {
	const old = [{ t: 0, supplied: 1000, consumed: 300 }];
	const { samples, value } = windowCop(
		old,
		25 * HOUR,
		{ supplied: 10, consumed: 3 },
		24 * HOUR,
	);
	assert.deepEqual(samples, [{ t: 25 * HOUR, supplied: 10, consumed: 3 }]);
	assert.equal(value, null);
});
