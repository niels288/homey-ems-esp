// What the system overview widget shows, from the app's devices' capability values (ADR 0005). Pure: no I/O.

/**
 * @param {{ [type: string]: { [capabilityId: string]: unknown } }} byType capability values per EMS device type
 * @param {string} language Homey's language, for number formatting
 * @returns {{ text: { [field: string]: string | null }, on: { [part: string]: boolean } }}
 */
function overview(byType, language) {
	const boiler = byType.boiler ?? {};
	const thermostat = byType.thermostat ?? {};
	const number = (value, digits) =>
		typeof value === "number"
			? value.toLocaleString(language, {
					minimumFractionDigits: digits,
					maximumFractionDigits: digits,
				})
			: null;
	const degrees = (value) => withUnit(number(value, 1), "°C");
	const percent = (value) => withUnit(number(value, 0), "%");
	const power = boiler["measure_power.hppower"];
	// An EnviLine reports `hpcompon` off while it delivers 3.2 kW (2026-10-20), so heat output counts too.
	const compressorOn = boiler["ems_boolean.hpcompon"] === true || power > 0;
	const pumpSpeed = boiler["ems_percent.hpcircspd"];
	const elementLevel = boiler["ems_percent.auxheaterlevel"];
	return {
		text: {
			outdoor: degrees(
				boiler["measure_temperature.outdoortemp"] ??
					thermostat["measure_temperature.dampedoutdoortemp"],
			),
			condenser: degrees(boiler["measure_temperature.hptc3"]),
			flow: degrees(
				boiler["measure_temperature.hptc1"] ??
					boiler["measure_temperature.curflowtemp"],
			),
			return: degrees(
				boiler["measure_temperature.hptc0"] ??
					boiler["measure_temperature.rettemp"],
			),
			cylinder: degrees(boiler["measure_temperature.dhw_curtemp"]),
			room: degrees(thermostat["measure_temperature.hc1_currtemp"]),
			targetFlow: degrees(thermostat["measure_temperature.hc1_targetflowtemp"]),
			pump: percent(pumpSpeed),
			element: elementLevel > 0 ? percent(elementLevel) : null,
			compressor:
				compressorOn && typeof power === "number"
					? withUnit(number(power / 1000, 1), "kW")
					: null,
			cop: number(boiler["ems_cop.day"] ?? boiler["ems_cop.total"], 1),
		},
		on: {
			compressor: compressorOn,
			pump: boiler["ems_boolean.heatingpump"] === true || pumpSpeed > 0,
			element: elementLevel > 0,
			toCylinder: boiler["ems_boolean.dhw_3wayvalve"] === true,
			charging: boiler["ems_boolean.dhw_charging"] === true,
		},
	};
}

function withUnit(text, unit) {
	return text === null ? null : `${text} ${unit}`;
}

module.exports = { overview };
