// Coefficient of performance from the heat pump's own energy counters (ADR 0003). Pure: no I/O, no clock.
const { isSet } = require("./capabilities");

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

// Consumption includes the electric aux heater, or the COP flatters a heat pump that leans on it.
const COPS = [
	{
		key: "cop.total",
		title: { en: "COP total", nl: "COP totaal" },
		supplied: ["nrgsupptotal"],
		consumed: ["nrgconstotal"],
	},
	{
		key: "cop.heating",
		title: { en: "COP heating", nl: "COP verwarming" },
		supplied: ["nrgsuppheating"],
		consumed: ["nrgconscompheating", "auxelecheatnrgconsheating"],
	},
	{
		key: "cop.dhw",
		title: { en: "COP hot water", nl: "COP warm water" },
		supplied: ["dhw.nrgsupp"],
		consumed: ["dhw.nrgconscomp", "dhw.auxelecheatnrgcons"],
	},
	{
		key: "cop.day",
		title: { en: "COP last 24 hours", nl: "COP afgelopen 24 uur" },
		supplied: ["nrgsupptotal"],
		consumed: ["nrgconstotal"],
		windowMs: DAY_MS,
	},
];

/** COP capabilities for a device whose entities include the counters they divide. */
function copCapabilities(entities) {
	return COPS.filter(
		({ supplied, consumed }) =>
			supplied[0] in entities && consumed[0] in entities,
	).map((cop) => ({
		id: `ems_cop.${cop.key.split(".")[1]}`,
		key: cop.key,
		options: { title: cop.title },
		factor: 1,
		cop,
	}));
}

/** Supplied and consumed kWh from flat `/values`; null when a main counter is missing or unset. Missing aux counters count as 0. */
function energyOf({ supplied, consumed }, raw) {
	if (!isSet(raw[supplied[0]]) || !isSet(raw[consumed[0]])) return null;
	const sum = (keys) =>
		keys.reduce((total, key) => total + (isSet(raw[key]) ? raw[key] : 0), 0);
	return { supplied: sum(supplied), consumed: sum(consumed) };
}

function ratio({ supplied, consumed }) {
	return consumed > 0 ? Math.round((supplied / consumed) * 100) / 100 : null;
}

/**
 * The COP over the last `windowMs`, from hourly counter samples the caller keeps.
 * Null until the samples span the window: the counters count whole kWh, so a short window is noise.
 * @returns {{ samples: { t: number, supplied: number, consumed: number }[], value: number | null }}
 */
function windowCop(samples, now, energy, windowMs) {
	if (!energy) return { samples, value: null };
	const last = samples.at(-1);
	// A counter that went down was reset (gateway or heat pump replaced): start over.
	let next = last && energy.consumed < last.consumed ? [] : [...samples];
	if (!next.length || now - next.at(-1).t >= HOUR_MS) {
		next.push({ t: now, ...energy });
	}
	while (next.length > 1 && next[1].t <= now - windowMs) next = next.slice(1);
	const base = next[0];
	const value =
		now - base.t >= windowMs
			? ratio({
					supplied: energy.supplied - base.supplied,
					consumed: energy.consumed - base.consumed,
				})
			: null;
	return { samples: next, value };
}

module.exports = { copCapabilities, energyOf, ratio, windowCop };
