// Prints what the app would create for a gateway: node scripts/discover.js <host>
const { Gateway } = require("../lib/gateway");

async function main(host) {
	const gateway = new Gateway(host);
	for (const { type, name } of await gateway.emsDevices()) {
		const capabilities = await gateway.discover(type);
		const readings = new Map(
			(await gateway.readings(type, capabilities)).map(({ id, value }) => [
				id,
				value,
			]),
		);
		console.log(`\n${type} (${name}): ${capabilities.length} capabilities`);
		for (const { id, options } of capabilities) {
			const units = options.units ? ` ${options.units.en}` : "";
			console.log(
				`  ${id.padEnd(44)} ${String(readings.get(id) ?? "-").padStart(10)}${units}  ${options.title.en}`,
			);
		}
	}
}

main(process.argv[2]).catch((err) => {
	console.error(err.message);
	process.exitCode = 1;
});
