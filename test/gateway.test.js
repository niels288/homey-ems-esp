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

test("choices list every value with its current reading, null where the gateway has none", async (t) => {
	t.mock.method(
		globalThis,
		"fetch",
		answering({
			"/api/boiler/entities": require("./fixtures/boiler-entities.json"),
			"/api/boiler/values": require("./fixtures/boiler-values.json"),
		}),
	);
	const choices = await new Gateway("gw").choices("boiler");
	const flow = choices.find(({ key }) => key === "curflowtemp");
	assert.equal(flow.title, "current flow temperature");
	assert.equal(flow.units, "°C");
	assert.equal(typeof flow.value, "number");
	assert.ok(choices.some(({ value }) => value === null));
	assert.equal(globalThis.fetch.mock.callCount(), 2);
});

test("readings carry lifetime COP, and the energy for the 24-hour COP the device keeps", async (t) => {
	t.mock.method(
		globalThis,
		"fetch",
		answering({
			"/api/boiler/entities": require("./fixtures/boiler-entities.json"),
			"/api/boiler/values": require("./fixtures/boiler-values.json"),
		}),
	);
	const gateway = new Gateway("gw");
	const capabilities = await gateway.discover("boiler");
	const readings = await gateway.readings("boiler", capabilities);
	const of = (id) => readings.find((reading) => reading.id === id);
	assert.equal(of("ems_cop.total").value, 3.69);
	assert.deepEqual(of("ems_cop.day"), {
		id: "ems_cop.day",
		value: null,
		energy: { supplied: 32513, consumed: 8816 },
	});
	const choices = await gateway.choices("boiler");
	assert.equal(choices.find(({ key }) => key === "cop.day").pending, true);
});

test("write posts the value with the access token to the entity's path", async (t) => {
	t.mock.method(globalThis, "fetch", async () => ({
		ok: true,
		status: 200,
		json: async () => ({ message: "OK" }),
	}));
	await new Gateway("gw").write("thermostat", "dhw.charge", true, "tok");
	const [url, init] = globalThis.fetch.mock.calls[0].arguments;
	assert.equal(url, "http://gw/api/thermostat/dhw/charge");
	assert.equal(init.method, "POST");
	assert.equal(init.headers.Authorization, "Bearer tok");
	assert.deepEqual(JSON.parse(init.body), { value: true });
});

test("write without a valid access token says so", async (t) => {
	t.mock.method(globalThis, "fetch", async () => ({
		ok: false,
		status: 401,
		json: async () => ({}),
	}));
	await assert.rejects(
		new Gateway("gw").write("thermostat", "dhw.charge", true, ""),
		/access token/,
	);
});

test("requests to one gateway go one at a time, also from different devices", async (t) => {
	let inFlight = 0;
	let most = 0;
	t.mock.method(globalThis, "fetch", async () => {
		most = Math.max(most, ++inFlight);
		await new Promise((resolve) => setImmediate(resolve));
		inFlight--;
		return { ok: true, status: 200, json: async () => ({ devices: [] }) };
	});
	await Promise.all([
		new Gateway("one-at-a-time").emsDevices(),
		new Gateway("one-at-a-time").emsDevices(),
		new Gateway("one-at-a-time").write("thermostat", "dhw.charge", true, "tok"),
	]);
	assert.equal(globalThis.fetch.mock.callCount(), 3);
	assert.equal(most, 1);
});

test("a gateway that answers 429 gets a pause before the next request", async (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const statuses = [429, 200];
	t.mock.method(globalThis, "fetch", async () => {
		const status = statuses.shift();
		return { ok: status === 200, status, json: async () => ({ devices: [] }) };
	});
	const gateway = new Gateway("busy");
	await assert.rejects(gateway.emsDevices(), /HTTP 429/);
	const next = gateway.emsDevices();
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(globalThis.fetch.mock.callCount(), 1, "still pausing");
	t.mock.timers.tick(30_000);
	await next;
	assert.equal(globalThis.fetch.mock.callCount(), 2);
});
