const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const shared = (path) => {
	const html = readFileSync(path, "utf8");
	return html.slice(html.indexOf("// <shared>"), html.indexOf("// </shared>"));
};

test("pairing/repair and app settings render values with the same code", () => {
	const pairing = shared("drivers/ems-device/pair/values.html");
	assert.ok(pairing.length > 1000);
	assert.equal(shared("settings/index.html"), pairing);
});
