// How EMS-ESP entities become Homey capabilities (ADR 0001). Pure: no I/O.

/** Flattens a `/api/<device>/values` answer to `{ key: raw }`; circuits become `hc1.seltemp`, matching the `/entities` keys. */
function flattenValues(values) {
	const flat = {};
	for (const [name, value] of Object.entries(values)) {
		if (value !== null && typeof value === "object") {
			for (const [inner, innerValue] of Object.entries(value)) {
				flat[`${name}.${inner}`] = innerValue;
			}
		} else {
			flat[name] = value;
		}
	}
	return flat;
}

/**
 * The capability for one entity, or null when version 1 does not expose it
 * (writeable settings, commands, unknown meta).
 * @returns {{ id: string, options: object } | null}
 */
function capabilityFor(key, meta) {
	if (!meta.type || meta.writeable) return null;
	const base = baseCapability(meta);
	if (!base) return null;
	const options = { title: { en: meta.fullname || key } };
	if (base === "ems_number" && meta.uom) options.units = { en: meta.uom };
	return { id: `${base}.${key.replaceAll(".", "_")}`, options };
}

function baseCapability({ type, uom }) {
	if (type === "boolean") return "ems_boolean";
	if (type === "enum" || type === "string") return "ems_text";
	if (type !== "number") return null;
	if (uom === "°C") return "measure_temperature";
	if (uom === "kW") return "measure_power";
	if (uom === "kWh") return "meter_power";
	if (uom === "%") return "ems_percent";
	return "ems_number";
}

/** Converts a raw EMS-ESP value to what the capability expects; null when there is no usable value. */
function homeyValue(capabilityId, raw) {
	const base = capabilityId.split(".")[0];
	if (base === "ems_boolean") {
		// The gateway's "boolean format" setting decides between on/off, ON/OFF, true/false and 1/0.
		const flag = typeof raw === "string" ? raw.toLowerCase() : raw;
		if (["on", "true", true, 1].includes(flag)) return true;
		if (["off", "false", false, 0].includes(flag)) return false;
		return null;
	}
	if (base === "ems_text") return raw === undefined ? null : String(raw);
	if (typeof raw !== "number") return null;
	// EMS-ESP reports kW; Homey's measure_power is in W.
	return base === "measure_power" ? raw * 1000 : raw;
}

const BASES = [
	"measure_temperature",
	"measure_power",
	"meter_power",
	"ems_number",
	"ems_percent",
	"ems_boolean",
	"ems_text",
];

/** True for capabilities that discovery creates (and may remove again), as opposed to ones a user or Homey added. */
function isDiscovered(capabilityId) {
	return (
		capabilityId.includes(".") && BASES.includes(capabilityId.split(".")[0])
	);
}

module.exports = { flattenValues, capabilityFor, homeyValue, isDiscovered };
