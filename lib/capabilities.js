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

// The gateway's "boolean format" setting picks on/off, ON/OFF, true/false or 1/0, and on/off come in its
// language: EMS-ESP's own translations (src/core/locale_translations.h), compared as is because
// lowercasing "AÇIK" does not give "açık".
const ON = [
	...["on", "an", "aan", "på", "włączono", "açık", "zap"],
	...["ON", "AN", "AAN", "PÅ", "wł.", "AÇIK", "ZAP"],
	...["true", true, 1],
];
const OFF = [
	...["off", "aus", "uit", "av", "wyłączono", "kapalı", "vyp"],
	...["OFF", "AUS", "UIT", "AV", "wył.", "KAPALI", "VYP"],
	...["false", false, 0],
];

/**
 * The capability for one entity, or null when version 1 does not expose it
 * (writeable settings, commands, unknown meta).
 * `factor` scales the EMS-ESP number to the capability's unit (kW → W).
 * @returns {{ id: string, options: object, factor: number } | null}
 */
function capabilityFor(key, meta) {
	if (!meta.type || meta.writeable) return null;
	const base = baseCapability(meta);
	if (!base) return null;
	const options = { title: { en: meta.fullname || key } };
	if (base === "ems_number" && meta.uom) options.units = { en: meta.uom };
	const factor = meta.uom === "kW" ? 1000 : 1;
	return { id: `${base}.${key.replaceAll(".", "_")}`, options, factor };
}

function baseCapability({ type, uom }) {
	if (type === "boolean") return "ems_boolean";
	if (type === "enum" || type === "string") return "ems_text";
	if (type !== "number") return null;
	if (uom === "°C") return "measure_temperature";
	if (uom === "kW" || uom === "W") return "measure_power";
	if (uom === "kWh") return "meter_power";
	if (uom === "%") return "ems_percent";
	return "ems_number";
}

// EMS-ESP sends 0xFFFFFFFF for a 32-bit value the device never set; uptimes in minutes get it divided by 60.
const UNSET = [0xffffffff, Math.floor(0xffffffff / 60)];

/** Converts a raw EMS-ESP value for a capability from `capabilityFor`; null when there is no usable value. */
function homeyValue({ id, factor }, raw) {
	const base = id.split(".")[0];
	if (base === "ems_boolean") {
		if (ON.includes(raw)) return true;
		if (OFF.includes(raw)) return false;
		return null;
	}
	if (base === "ems_text") return raw === undefined ? null : String(raw);
	return isSet(raw) ? raw * factor : null;
}

/** True for a number the device actually reported. */
function isSet(raw) {
	return typeof raw === "number" && !UNSET.includes(raw);
}

const STANDARD_UNITS = {
	measure_temperature: "°C",
	measure_power: "W",
	meter_power: "kWh",
	ems_percent: "%",
};

/** The unit Homey shows for a capability from `capabilityFor`; empty for text and on/off values. */
function unitsOf({ id, options }) {
	return options.units?.en ?? STANDARD_UNITS[id.split(".")[0]] ?? "";
}

const BASES = [
	"measure_temperature",
	"measure_power",
	"meter_power",
	"ems_number",
	"ems_percent",
	"ems_boolean",
	"ems_text",
	"ems_cop",
];

/** True for capabilities that discovery creates (and may remove again), as opposed to ones a user or Homey added. */
function isDiscovered(capabilityId) {
	return (
		capabilityId.includes(".") && BASES.includes(capabilityId.split(".")[0])
	);
}

module.exports = {
	flattenValues,
	capabilityFor,
	homeyValue,
	isDiscovered,
	isSet,
	unitsOf,
};
