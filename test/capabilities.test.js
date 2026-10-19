const test = require("node:test");
const assert = require("node:assert/strict");
const {
	flattenValues,
	capabilityFor,
	homeyValue,
	isDiscovered,
} = require("../lib/capabilities");

// EnviLine + RC300; see fixtures/README.md for how these were captured.
const entities = {
	boiler: require("./fixtures/boiler-entities.json"),
	thermostat: require("./fixtures/thermostat-entities.json"),
};
const values = {
	boiler: require("./fixtures/boiler-values.json"),
	thermostat: require("./fixtures/thermostat-values.json"),
};

test("flattenValues keys heating circuits like /entities does", () => {
	const flat = flattenValues(values.thermostat);
	assert.equal(flat["hc1.seltemp"], 21.5);
	assert.equal(flat.hc1, undefined);
	assert.ok("hc1.seltemp" in entities.thermostat);
});

test("readings map to standard capabilities where Homey has one", () => {
	assert.deepEqual(capabilityFor("curflowtemp", entities.boiler.curflowtemp), {
		id: "measure_temperature.curflowtemp",
		options: { title: { en: "current flow temperature" } },
	});
	assert.equal(
		capabilityFor("hppower", entities.boiler.hppower).id,
		"measure_power.hppower",
	);
	assert.equal(
		capabilityFor("nrgsupptotal", entities.boiler.nrgsupptotal).id,
		"meter_power.nrgsupptotal",
	);
});

test("other readings map to the generic app capabilities", () => {
	assert.equal(
		capabilityFor("hpactivity", entities.boiler.hpactivity).id,
		"ems_text.hpactivity",
	);
	assert.equal(
		capabilityFor("heatingactive", entities.boiler.heatingactive).id,
		"ems_boolean.heatingactive",
	);
	assert.equal(
		capabilityFor("hpcircspd", entities.boiler.hpcircspd).id,
		"ems_percent.hpcircspd",
	);
	const minutes = capabilityFor("uptimecompww", entities.boiler.uptimecompww);
	assert.equal(minutes.id, "ems_number.uptimecompww");
	assert.deepEqual(minutes.options.units, { en: "minutes" });
});

test("circuit keys become valid capability ids", () => {
	const meta = { ...entities.thermostat["hc1.seltemp"], writeable: false };
	assert.equal(
		capabilityFor("hc1.seltemp", meta).id,
		"measure_temperature.hc1_seltemp",
	);
});

test("writeable settings and unknown meta are not exposed in version 1", () => {
	assert.equal(
		capabilityFor("hc1.seltemp", entities.thermostat["hc1.seltemp"]),
		null,
	);
	assert.equal(capabilityFor("remotetemp", {}), null);
});

test("every discovered capability id is valid and unique", () => {
	const ids = Object.values(entities).flatMap((device) =>
		Object.entries(device)
			.map(([key, meta]) => capabilityFor(key, meta))
			.filter(Boolean)
			.map(({ id }) => id),
	);
	assert.ok(ids.length > 50, `only ${ids.length} capabilities`);
	assert.equal(new Set(ids).size, ids.length);
	for (const id of ids) assert.match(id, /^[a-z_]+\.[a-z0-9_]+$/);
});

test("homeyValue converts units and on/off, and drops values that are not set", () => {
	assert.equal(homeyValue("measure_power.hppower", 1.5), 1500);
	assert.equal(homeyValue("measure_temperature.curflowtemp", 44.4), 44.4);
	assert.equal(homeyValue("ems_boolean.heatingactive", "off"), false);
	assert.equal(homeyValue("ems_boolean.heatingactive", "ON"), true);
	assert.equal(homeyValue("ems_text.hpactivity", "none"), "none");
	assert.equal(homeyValue("meter_power.nrgsupptotal", "not set"), null);
	assert.equal(homeyValue("ems_number.uptimecompww", undefined), null);
});

test("isDiscovered recognises every capability discovery can create, and nothing else", () => {
	const ids = Object.values(entities).flatMap((device) =>
		Object.entries(device)
			.map(([key, meta]) => capabilityFor(key, { ...meta, writeable: false }))
			.filter(Boolean)
			.map(({ id }) => id),
	);
	for (const id of ids) assert.ok(isDiscovered(id), id);
	assert.equal(isDiscovered("measure_temperature"), false);
	assert.equal(isDiscovered("onoff"), false);
});
