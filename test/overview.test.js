const test = require("node:test");
const assert = require("node:assert/strict");
const { overview } = require("../lib/overview");

const boiler = {
	"measure_temperature.outdoortemp": 8.8,
	"measure_temperature.hptc3": 33.9,
	"measure_temperature.hptc1": 33.5,
	"measure_temperature.hptc0": 32.3,
	"measure_temperature.dhw_curtemp": 45.6,
	"ems_percent.hpcircspd": 10,
	"ems_boolean.hpcompon": true,
	"measure_power.hppower": 1250,
	"ems_percent.auxheaterlevel": 0,
	"ems_boolean.dhw_3wayvalve": true,
	"ems_boolean.dhw_charging": true,
	"ems_cop.total": 3.69,
};
const thermostat = {
	"measure_temperature.hc1_currtemp": 22,
	"measure_temperature.hc1_targetflowtemp": 30,
};

test("the overview formats the installation's values in Homey's language", () => {
	const { text, on } = overview({ boiler, thermostat }, "nl");
	assert.deepEqual(text, {
		outdoor: "8,8 °C",
		condenser: "33,9 °C",
		flow: "33,5 °C",
		return: "32,3 °C",
		cylinder: "45,6 °C",
		room: "22,0 °C",
		targetFlow: "30,0 °C",
		pump: "10 %",
		element: null,
		compressor: "1,3 kW",
		cop: "3,7",
	});
	assert.deepEqual(on, {
		compressor: true,
		pump: true,
		element: false,
		toCylinder: true,
		charging: true,
	});
	assert.equal(overview({ boiler, thermostat }, "en").text.outdoor, "8.8 °C");
});

test("missing or hidden values leave their place empty instead of breaking the drawing", () => {
	const { text, on } = overview({}, "nl");
	assert.ok(Object.values(text).every((value) => value === null));
	assert.ok(Object.values(on).every((value) => value === false));
	assert.equal(
		overview(
			{ boiler: { "ems_boolean.hpcompon": false, "measure_power.hppower": 0 } },
			"nl",
		).text.compressor,
		null,
	);
});

test("compressor power decides whether the compressor runs; the flag only without power", () => {
	const running = overview(
		{
			boiler: { "ems_boolean.hpcompon": false, "measure_power.hppower": 3200 },
		},
		"nl",
	);
	assert.equal(running.on.compressor, true);
	assert.equal(running.text.compressor, "3,2 kW");
	const idle = overview(
		{ boiler: { "ems_boolean.hpcompon": true, "measure_power.hppower": 0 } },
		"nl",
	);
	assert.equal(idle.on.compressor, false);
	assert.equal(
		overview({ boiler: { "ems_boolean.hpcompon": true } }, "nl").on.compressor,
		true,
	);
});
