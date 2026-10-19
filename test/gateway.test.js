const test = require("node:test");
const assert = require("node:assert/strict");
const { Gateway } = require("../lib/gateway");

function answering(byPath) {
	return async (url) => {
		const body = byPath[new URL(url).pathname];
		return {
			ok: body !== undefined,
			status: body === undefined ? 404 : 200,
			json: async () => body,
		};
	};
}

test("discover builds capabilities from one /entities answer", async (t) => {
	t.mock.method(
		globalThis,
		"fetch",
		answering({
			"/api/boiler/entities": require("./fixtures/boiler-entities.json"),
		}),
	);
	const capabilities = await new Gateway("gw").discover("boiler");
	assert.ok(
		capabilities.some(
			({ id, key }) =>
				id === "measure_temperature.curflowtemp" && key === "curflowtemp",
		),
	);
	assert.equal(globalThis.fetch.mock.callCount(), 1);
});

test("discover refuses firmware before 3.7 instead of probing every entity", async (t) => {
	t.mock.method(
		globalThis,
		"fetch",
		answering({
			"/api/boiler/entities": require("./fixtures/boiler-entities-3.6.3-names-only.json"),
		}),
	);
	await assert.rejects(new Gateway("gw").discover("boiler"), /3\.7 or newer/);
});

test("readings take values from /values, keyed like the entities", async (t) => {
	t.mock.method(
		globalThis,
		"fetch",
		answering({
			"/api/thermostat/values": require("./fixtures/thermostat-values.json"),
		}),
	);
	const readings = await new Gateway("gw").readings("thermostat", [
		{ id: "measure_temperature.hc1_seltemp", key: "hc1.seltemp", factor: 1 },
	]);
	assert.deepEqual(readings, [
		{ id: "measure_temperature.hc1_seltemp", value: 21.5 },
	]);
});

test("emsDevices lists each EMS device type once, as the API addresses them by type", async (t) => {
	t.mock.method(
		globalThis,
		"fetch",
		answering({
			"/api/system": {
				devices: [
					{ type: "boiler", name: "CUHP/Enviline", entities: 155 },
					{ type: "thermostat", name: "RC300", entities: 48 },
					{ type: "thermostat", name: "EasyControl/CT200", entities: 0 },
				],
			},
		}),
	);
	assert.deepEqual(await new Gateway("gw").emsDevices(), [
		{ type: "boiler", name: "CUHP/Enviline" },
		{ type: "thermostat", name: "RC300" },
	]);
});

test("discover fails on an empty entity list instead of removing every capability", async (t) => {
	t.mock.method(globalThis, "fetch", answering({ "/api/boiler/entities": {} }));
	await assert.rejects(
		new Gateway("gw").discover("boiler"),
		/no boiler entities yet/,
	);
});
