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
		factor: 1,
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
	const minutes = capabilityFor("burnworkmin", entities.boiler.burnworkmin);
	assert.equal(minutes.id, "ems_number.burnworkmin");
	assert.deepEqual(minutes.options.units, { en: "min" });
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

test("every discovered capability id is valid and unique within its device", () => {
	for (const [device, byKey] of Object.entries(entities)) {
		const ids = Object.entries(byKey)
			.map(([key, meta]) => capabilityFor(key, meta))
			.filter(Boolean)
			.map(({ id }) => id);
		assert.ok(ids.length > 10, `${device}: only ${ids.length} capabilities`);
		assert.equal(new Set(ids).size, ids.length, device);
		for (const id of ids) assert.match(id, /^[a-z_]+\.[a-z0-9_]+$/);
	}
});

test("homeyValue scales power to W, reads every on/off format, and drops values that are not set", () => {
	const kw = capabilityFor("hppower", entities.boiler.hppower);
	const w = capabilityFor("hpcurrpower", entities.boiler.hpcurrpower);
	assert.equal(w.id, "measure_power.hpcurrpower");
	assert.equal(homeyValue(kw, 1.5), 1500);
	assert.equal(homeyValue(w, 1500), 1500);
	const flag = { id: "ems_boolean.heatingactive", factor: 1 };
	assert.equal(homeyValue(flag, "off"), false);
	assert.equal(homeyValue(flag, "ON"), true);
	assert.equal(
		homeyValue({ id: "ems_text.hpactivity", factor: 1 }, "none"),
		"none",
	);
	assert.equal(
		homeyValue({ id: "meter_power.nrgsupptotal", factor: 1 }, "not set"),
		null,
	);
	assert.equal(
		homeyValue({ id: "ems_number.burnworkmin", factor: 1 }, undefined),
		null,
	);
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

test("homeyValue drops EMS-ESP's unset marker, also after its seconds-to-minutes conversion", () => {
	const counter = capabilityFor(
		"nrgsuppcooling",
		entities.boiler.nrgsuppcooling,
	);
	const minutes = capabilityFor(
		"uptimecompcooling",
		entities.boiler.uptimecompcooling,
	);
	assert.equal(homeyValue(counter, values.boiler.nrgsuppcooling), null);
	assert.equal(homeyValue(minutes, values.boiler.uptimecompcooling), null);
	assert.equal(homeyValue(minutes, values.boiler.uptimecompheating), 386665);
});

test("only the thermostat's hot water charge becomes a switch; every other setting stays out", () => {
	const charge = capabilityFor(
		"dhw.charge",
		entities.thermostat["dhw.charge"],
		"thermostat",
	);
	assert.equal(charge.id, "ems_switch.dhw_charge");
	assert.equal(homeyValue(charge, "off"), false);
	assert.equal(homeyValue(charge, "on"), true);
	assert.equal(
		capabilityFor("dhw.charge", entities.thermostat["dhw.charge"], "boiler"),
		null,
	);
	assert.equal(
		capabilityFor("dhw.onetime", entities.boiler["dhw.onetime"], "boiler"),
		null,
	);
	assert.ok(isDiscovered("ems_switch.dhw_charge"));
});

test("homeyValue reads on/off in every language the gateway speaks", () => {
	const flag = capabilityFor("heatingactive", entities.boiler.heatingactive);
	for (const on of ["aan", "AAN", "an", "på", "wł.", "açık", "ZAP"]) {
		assert.equal(homeyValue(flag, on), true, on);
	}
	for (const off of ["uit", "UIT", "aus", "AV", "wył.", "kapalı", "vyp"]) {
		assert.equal(homeyValue(flag, off), false, off);
	}
	assert.equal(homeyValue(flag, "misschien"), null);
});
