//#region node_modules/.nitro/vite/services/ssr/assets/numbers-CN4WsuIs.js
/** Hypixel product ids are the canonical key. Case is normalized; punctuation is kept. */
function canonicalItemId(id) {
	return id.trim().toUpperCase();
}
/** Last-resort label when neither Hypixel nor Coflnet has a display name. */
function derivedName(id) {
	const enchant = id.startsWith("ENCHANTMENT_");
	const shard = id.startsWith("SHARD_");
	const essence = id.startsWith("ESSENCE_");
	let core = id;
	if (enchant) core = id.slice(12);
	else if (shard) core = id.slice(6);
	else if (essence) core = id.slice(8);
	let name = core.split("_").filter(Boolean).map((word) => {
		const lower = word.toLowerCase();
		return lower.charAt(0).toUpperCase() + lower.slice(1);
	}).join(" ") || id;
	if (enchant) name += " Enchant";
	else if (shard) name += " Shard";
	else if (essence) name += " Essence";
	return name;
}
function categoryFromId(id) {
	if (id.startsWith("ENCHANTMENT_")) return "ENCHANTMENT";
	if (id.startsWith("SHARD_")) return "SHARD";
	if (id.startsWith("ESSENCE_")) return "ESSENCE";
	return null;
}
function newId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
	return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
var MULTIPLIERS = {
	k: 1e3,
	m: 1e6,
	b: 1e9
};
/** Parse desk input: `180`, `5M`, `2.5k`, `1,200`, `0.5b`. Null if it is not a finite number. */
function parseUserNumber(input) {
	const trimmed = input.trim().replace(/,/g, "").replace(/\s+/g, "");
	if (!trimmed) return null;
	const match = /^([+-]?(?:\d+\.?\d*|\.\d+))([kmb])?$/i.exec(trimmed);
	if (!match) return null;
	const value = Number(match[1]);
	if (!Number.isFinite(value)) return null;
	const suffix = match[2]?.toLowerCase() ?? "";
	const multiplier = suffix ? MULTIPLIERS[suffix] : 1;
	if (!multiplier) return null;
	return value * multiplier;
}
function finiteOrNull(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return value;
}
/** Positive finite prices only. Zero is treated as "no quote", not a real price of 0. */
function positiveOrNull(value) {
	const number = finiteOrNull(value);
	if (number === null || number <= 0) return null;
	return number;
}
/** Quantities and counts may be zero. Negative or non-finite values are missing, not zero. */
function nonNegativeOrNull(value) {
	const number = finiteOrNull(value);
	if (number === null || number < 0) return null;
	return number;
}
//#endregion
export { nonNegativeOrNull as a, newId as i, categoryFromId as n, parseUserNumber as o, derivedName as r, positiveOrNull as s, canonicalItemId as t };
