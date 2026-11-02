import { i as __toESM } from "../_runtime.mjs";
import { a as coefficientOfVariationPct, c as metricValue, i as catalogueHealth, l as percentChange, n as METRIC_BY_ID, o as coflWindowStats, r as METRIC_GROUPS, s as metricLabel, t as METRICS, u as priceGap } from "./metrics-CuiuGo0x.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { a as DialogPortal, i as DialogOverlay, n as DialogClose, o as DialogTitle, r as DialogContent, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { i as newId, o as parseUserNumber, t as canonicalItemId } from "./numbers-CN4WsuIs.mjs";
import { a as CartesianGrid, i as Line, n as YAxis, o as ResponsiveContainer, r as XAxis, s as Tooltip, t as LineChart } from "../_libs/recharts+[...].mjs";
import { t as useVirtualizer } from "../_libs/@tanstack/react-virtual+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BGgcZoqw.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatCoins(value) {
	if (value === null || !Number.isFinite(value)) return "—";
	const sign = value < 0 ? "−" : "";
	const absolute = Math.abs(value);
	if (absolute >= 1e9) return sign + trimScaled(absolute / 1e9) + "B";
	if (absolute >= 1e6) return sign + trimScaled(absolute / 1e6) + "M";
	if (absolute >= 1e3) return sign + trimScaled(absolute / 1e3) + "K";
	if (absolute >= 100) return sign + trimScaled(absolute);
	if (absolute >= 1) return sign + absolute.toFixed(2);
	return sign + absolute.toFixed(3);
}
function trimScaled(value) {
	const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
	return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
}
function formatExact(value, digits = 2) {
	if (value === null || !Number.isFinite(value)) return "—";
	return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}
function formatQty(value) {
	if (value === null || !Number.isFinite(value)) return "—";
	const sign = value < 0 ? "−" : "";
	const absolute = Math.abs(value);
	if (absolute >= 1e6) return sign + trimScaled(absolute / 1e6) + "M";
	if (absolute >= 1e4) return sign + trimScaled(absolute / 1e3) + "K";
	return sign + new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(absolute);
}
function formatPct(value, digits = 2) {
	if (value === null || !Number.isFinite(value)) return "—";
	return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}%`;
}
function formatAge(ms, now = Date.now()) {
	if (ms === null || !Number.isFinite(ms)) return "—";
	const delta = Math.max(0, now - ms);
	const seconds = Math.round(delta / 1e3);
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 48) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}
function formatClock(ms) {
	if (ms === null || !Number.isFinite(ms)) return "—";
	return new Intl.DateTimeFormat("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		day: "2-digit",
		month: "short"
	}).format(new Date(ms));
}
function cell(value) {
	if (value === null) return "";
	const text = typeof value === "number" ? formatExact(value, 4) : value;
	if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
	return text;
}
function toCsv(items, metricIds, ctx) {
	const lines = [metricIds.map((id) => METRIC_BY_ID.get(id)?.label ?? id).map((header) => cell(header)).join(",")];
	for (const item of items) lines.push(metricIds.map((id) => cell(metricValue(item, id, ctx))).join(","));
	return lines.join("\n");
}
var COMPARE_OPS = [
	"gt",
	"gte",
	"lt",
	"lte",
	"eq",
	"neq"
];
var RANGE_OPS = ["between", "outside"];
var TEXT_OPS = [
	"contains",
	"not_contains",
	"starts",
	"ends",
	"eq",
	"neq"
];
var PRESENCE_OPS = ["available", "unavailable"];
function isGroup(node) {
	return node.type === "group";
}
function emptyGroup(id = "root") {
	return {
		type: "group",
		id,
		logic: "and",
		negate: false,
		children: []
	};
}
function isEmptyValue(value) {
	return value === null || value === "";
}
function compareNumbers(left, op, right) {
	switch (op) {
		case "gt": return left > right;
		case "gte": return left >= right;
		case "lt": return left < right;
		case "lte": return left <= right;
		case "eq": return left === right;
		case "neq": return left !== right;
		default: return false;
	}
}
/**
* Numeric and text conditions fail when the metric is unavailable.
* Negation does not let a missing value through.
* Only presence operators answer "is unavailable".
*/
function matchCondition(item, condition, ctx) {
	const value = metricValue(item, condition.metric, ctx);
	if (condition.type === "presence") {
		const available = !isEmptyValue(value);
		const base = condition.op === "available" ? available : !available;
		return condition.negate ? !base : base;
	}
	if (isEmptyValue(value)) return false;
	let base = false;
	if (condition.type === "compare") {
		if (typeof value !== "number" || condition.value === null) return false;
		base = compareNumbers(value, condition.op, condition.value);
	} else if (condition.type === "range") {
		if (typeof value !== "number" || condition.min === null || condition.max === null) return false;
		const inside = value >= condition.min && value <= condition.max;
		base = condition.op === "between" ? inside : !inside;
	} else {
		if (typeof value !== "string") return false;
		const hay = value.toLowerCase();
		const needle = condition.value.trim().toLowerCase();
		switch (condition.op) {
			case "contains":
				base = hay.includes(needle);
				break;
			case "not_contains":
				base = !hay.includes(needle);
				break;
			case "starts":
				base = hay.startsWith(needle);
				break;
			case "ends":
				base = hay.endsWith(needle);
				break;
			case "eq":
				base = hay === needle;
				break;
			case "neq":
				base = hay !== needle;
				break;
			default: base = false;
		}
	}
	return condition.negate ? !base : base;
}
function matches(item, node, ctx) {
	if (!isGroup(node)) return matchCondition(item, node, ctx);
	if (node.children.length === 0) {
		const base = node.logic === "and";
		return node.negate ? !base : base;
	}
	const base = node.logic === "and" ? node.children.every((child) => matches(item, child, ctx)) : node.children.some((child) => matches(item, child, ctx));
	return node.negate ? !base : base;
}
function explain(item, node, ctx) {
	if (!isGroup(node)) {
		const pass = matchCondition(item, node, ctx);
		return {
			id: node.id,
			label: describeCondition(node),
			pass,
			detail: pass ? "Met" : "Not met"
		};
	}
	const children = node.children.map((child) => explain(item, child, ctx));
	const pass = matches(item, node, ctx);
	const logic = node.logic === "and" ? "All of" : "Any of";
	const label = node.children.length === 0 ? `${logic} (empty)` : logic;
	return {
		id: node.id,
		label: node.negate ? `Not (${label.toLowerCase()})` : label,
		pass,
		detail: pass ? "Group matched" : "Group did not match",
		children
	};
}
var OP_WORDS = {
	gt: ">",
	gte: "≥",
	lt: "<",
	lte: "≤",
	eq: "=",
	neq: "≠",
	between: "between",
	outside: "outside",
	contains: "contains",
	not_contains: "does not contain",
	starts: "starts with",
	ends: "ends with",
	available: "is available",
	unavailable: "is unavailable"
};
function describeCondition(condition) {
	const name = metricLabel(condition.metric);
	const prefix = condition.negate ? "Exclude if " : "";
	if (condition.type === "presence") return `${prefix}${name} ${OP_WORDS[condition.op]}`;
	if (condition.type === "compare") return `${prefix}${name} ${OP_WORDS[condition.op]} ${condition.text || "∅"}`;
	if (condition.type === "range") return `${prefix}${name} ${OP_WORDS[condition.op]} ${condition.minText || "∅"} and ${condition.maxText || "∅"}`;
	return `${prefix}${name} ${OP_WORDS[condition.op]} “${condition.value}”`;
}
function summarize(node) {
	if (!isGroup(node)) return describeCondition(node);
	if (node.children.length === 0) return node.negate ? "Match nothing (empty group, excluded)" : "No conditions — every product matches";
	const joiner = node.logic === "and" ? " AND " : " OR ";
	const inner = node.children.map((child) => isGroup(child) ? `(${summarize(child)})` : describeCondition(child)).join(joiner);
	return node.negate ? `NOT (${inner})` : inner;
}
function countConditions(node) {
	if (!isGroup(node)) return 1;
	return node.children.reduce((sum, child) => sum + countConditions(child), 0);
}
function isOp(value, allowed) {
	return typeof value === "string" && allowed.includes(value);
}
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value;
}
function sanitizeNode(raw) {
	const row = asRecord(raw);
	if (!row || typeof row.type !== "string" || typeof row.id !== "string" || !row.id) return null;
	if (row.type === "group") {
		if (row.logic !== "and" && row.logic !== "or") return null;
		if (!Array.isArray(row.children)) return null;
		const children = [];
		for (const child of row.children) {
			const clean = sanitizeNode(child);
			if (clean) children.push(clean);
		}
		return {
			type: "group",
			id: row.id,
			logic: row.logic,
			negate: row.negate === true,
			children
		};
	}
	if (typeof row.metric !== "string" || !row.metric) return null;
	const negate = row.negate === true;
	if (row.type === "compare" && isOp(row.op, COMPARE_OPS)) {
		const value = typeof row.value === "number" && Number.isFinite(row.value) ? row.value : null;
		const text = typeof row.text === "string" ? row.text : value === null ? "" : String(value);
		return {
			type: "compare",
			id: row.id,
			metric: row.metric,
			op: row.op,
			value,
			text,
			negate
		};
	}
	if (row.type === "range" && isOp(row.op, RANGE_OPS)) {
		const min = typeof row.min === "number" && Number.isFinite(row.min) ? row.min : null;
		const max = typeof row.max === "number" && Number.isFinite(row.max) ? row.max : null;
		return {
			type: "range",
			id: row.id,
			metric: row.metric,
			op: row.op,
			min,
			max,
			minText: typeof row.minText === "string" ? row.minText : min === null ? "" : String(min),
			maxText: typeof row.maxText === "string" ? row.maxText : max === null ? "" : String(max),
			negate
		};
	}
	if (row.type === "text" && isOp(row.op, TEXT_OPS)) return {
		type: "text",
		id: row.id,
		metric: row.metric,
		op: row.op,
		value: typeof row.value === "string" ? row.value : "",
		negate
	};
	if (row.type === "presence" && isOp(row.op, PRESENCE_OPS)) return {
		type: "presence",
		id: row.id,
		metric: row.metric,
		op: row.op,
		negate
	};
	return null;
}
function snapshotFromProducts(items, at) {
	return {
		at,
		ids: items.map((item) => item.id),
		weightedBuy: items.map((item) => item.buy.weightedPrice),
		weightedSell: items.map((item) => item.sell.weightedPrice),
		buyWeek: items.map((item) => item.buyWeek),
		sellWeek: items.map((item) => item.sellWeek)
	};
}
function appendSnapshot(existing, next) {
	return [...existing.filter((snap) => snap.at !== next.at), next].sort((a, b) => a.at - b.at).slice(-48);
}
function seriesFor(id, snaps) {
	const points = [];
	for (const snap of snaps) {
		const index = snap.ids.indexOf(id);
		if (index < 0) continue;
		points.push({
			at: snap.at,
			weightedBuy: snap.weightedBuy[index] ?? null,
			weightedSell: snap.weightedSell[index] ?? null,
			buyWeek: snap.buyWeek[index] ?? null,
			sellWeek: snap.sellWeek[index] ?? null
		});
	}
	points.sort((a, b) => a.at - b.at);
	return points;
}
function numbers(points, key) {
	const values = [];
	for (const point of points) {
		const value = point[key];
		if (value !== null && Number.isFinite(value)) values.push(value);
	}
	return values;
}
function statsFromPoints(points) {
	if (points.length === 0) return null;
	const first = points[0];
	const last = points[points.length - 1];
	const prev = points.length >= 2 ? points[points.length - 2] : null;
	return {
		samples: points.length,
		spanMs: last.at - first.at,
		from: first.at,
		to: last.at,
		weightedBuyChangePct: points.length >= 2 ? percentChange(first.weightedBuy, last.weightedBuy) : null,
		weightedSellChangePct: points.length >= 2 ? percentChange(first.weightedSell, last.weightedSell) : null,
		weightedBuyPrevPct: prev ? percentChange(prev.weightedBuy, last.weightedBuy) : null,
		weightedSellPrevPct: prev ? percentChange(prev.weightedSell, last.weightedSell) : null,
		buyVolatilityPct: coefficientOfVariationPct(numbers(points, "weightedBuy")),
		sellVolatilityPct: coefficientOfVariationPct(numbers(points, "weightedSell")),
		buyWeekDelta: prev && prev.buyWeek !== null && last.buyWeek !== null ? last.buyWeek - prev.buyWeek : null,
		sellWeekDelta: prev && prev.sellWeek !== null && last.sellWeek !== null ? last.sellWeek - prev.sellWeek : null
	};
}
function decorateWithHistory(items, snaps) {
	if (snaps.length === 0) return items.map((item) => item.local === null ? item : {
		...item,
		local: null
	});
	const byId = /* @__PURE__ */ new Map();
	const ordered = [...snaps].sort((a, b) => a.at - b.at);
	for (const snap of ordered) for (let index = 0; index < snap.ids.length; index += 1) {
		const id = snap.ids[index];
		let series = byId.get(id);
		if (!series) {
			series = [];
			byId.set(id, series);
		}
		series.push({
			at: snap.at,
			weightedBuy: snap.weightedBuy[index] ?? null,
			weightedSell: snap.weightedSell[index] ?? null,
			buyWeek: snap.buyWeek[index] ?? null,
			sellWeek: snap.sellWeek[index] ?? null
		});
	}
	return items.map((item) => ({
		...item,
		local: statsFromPoints(byId.get(item.id) ?? [])
	}));
}
var DB_NAME = "bazaar-desk";
var STORE = "snapshots";
var KEY = "log";
function openDb() {
	if (typeof indexedDB === "undefined") return Promise.resolve(null);
	return new Promise((resolve) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(null);
	});
}
async function readLog() {
	const db = await openDb();
	if (!db) return [];
	return new Promise((resolve) => {
		const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
		request.onsuccess = () => {
			const value = request.result;
			resolve(Array.isArray(value?.snapshots) ? value.snapshots : []);
		};
		request.onerror = () => resolve([]);
	});
}
async function writeLog(snapshots) {
	const db = await openDb();
	if (!db) return false;
	return new Promise((resolve) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put({ snapshots }, KEY);
		tx.oncomplete = () => resolve(true);
		tx.onerror = () => resolve(false);
	});
}
async function loadStoredSnapshots() {
	try {
		return await readLog();
	} catch {
		return [];
	}
}
async function rememberSnapshot(existing, next) {
	const snapshots = appendSnapshot(existing, next);
	try {
		await writeLog(snapshots);
	} catch {}
	return snapshots;
}
function range(id, metric, min, max, minText, maxText) {
	return {
		type: "range",
		id,
		metric,
		op: "between",
		min,
		max,
		minText,
		maxText
	};
}
function above(id, metric, value, text) {
	return {
		type: "compare",
		id,
		metric,
		op: "gt",
		value,
		text
	};
}
/** The example the desk opens with. Every field is ordinary filter data — edit or delete it. */
function exampleImbalancePreset(now = 0) {
	return {
		id: "example-imbalance",
		name: "Example: order-value band",
		filter: {
			type: "group",
			id: "example-root",
			logic: "and",
			negate: false,
			children: [
				range("ex-buy-value", "estBuyValue", 5e6, 15e6, "5M", "15M"),
				range("ex-sell-value", "estSellValue", 5e6, 15e6, "5M", "15M"),
				above("ex-gap", "estValueDiff", 2e6, "2M"),
				above("ex-buy-hour", "buyPerHour", 180, "180"),
				above("ex-sell-hour", "sellPerHour", 180, "180")
			]
		},
		sorts: [
			{
				id: "ex-s1",
				metric: "estValueDiff",
				direction: "desc"
			},
			{
				id: "ex-s2",
				metric: "buyPerHour",
				direction: "desc"
			},
			{
				id: "ex-s3",
				metric: "sellPerHour",
				direction: "desc"
			},
			{
				id: "ex-s4",
				metric: "name",
				direction: "asc"
			}
		],
		createdAt: now,
		updatedAt: now
	};
}
function allProductsPreset(now = 0) {
	return {
		id: "all-products",
		name: "Entire catalogue",
		filter: {
			...emptyGroup("all-root"),
			children: []
		},
		sorts: [{
			id: "all-s1",
			metric: "hourlyTurnover",
			direction: "desc"
		}, {
			id: "all-s2",
			metric: "name",
			direction: "asc"
		}],
		createdAt: now,
		updatedAt: now
	};
}
function defaultPresets(now = 0) {
	return [exampleImbalancePreset(now), allProductsPreset(now)];
}
var SORT_SHORTCUTS = [
	{
		id: "spread",
		label: "Highest instant spread",
		sorts: [{
			id: "sc-spread",
			metric: "instantSpread",
			direction: "desc"
		}, {
			id: "sc-spread-name",
			metric: "name",
			direction: "asc"
		}]
	},
	{
		id: "spread-pct",
		label: "Highest spread %",
		sorts: [{
			id: "sc-spread-pct",
			metric: "instantSpreadPct",
			direction: "desc"
		}, {
			id: "sc-spread-pct-name",
			metric: "name",
			direction: "asc"
		}]
	},
	{
		id: "buy-hour",
		label: "Highest buy / hour",
		sorts: [{
			id: "sc-buy-hour",
			metric: "buyPerHour",
			direction: "desc"
		}]
	},
	{
		id: "sell-hour",
		label: "Highest sell / hour",
		sorts: [{
			id: "sc-sell-hour",
			metric: "sellPerHour",
			direction: "desc"
		}]
	},
	{
		id: "turnover",
		label: "Highest hourly turnover",
		sorts: [{
			id: "sc-turn",
			metric: "hourlyTurnover",
			direction: "desc"
		}]
	},
	{
		id: "buy-value",
		label: "Largest buy order value",
		sorts: [{
			id: "sc-buy-val",
			metric: "estBuyValue",
			direction: "desc"
		}]
	},
	{
		id: "sell-value",
		label: "Largest sell order value",
		sorts: [{
			id: "sc-sell-val",
			metric: "estSellValue",
			direction: "desc"
		}]
	},
	{
		id: "up",
		label: "Highest price increase",
		sorts: [{
			id: "sc-up",
			metric: "weightedBuyChangePct",
			direction: "desc"
		}]
	},
	{
		id: "down",
		label: "Highest price decrease",
		sorts: [{
			id: "sc-down",
			metric: "weightedBuyChangePct",
			direction: "asc"
		}]
	},
	{
		id: "volty",
		label: "Highest volatility",
		sorts: [{
			id: "sc-vol",
			metric: "buyVolatilityPct",
			direction: "desc"
		}]
	}
];
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var scanBazaar = createServerFn({ method: "POST" }).validator((input) => ({ force: input?.force === true })).handler(createSsrRpc("d47887d1bc9fb7e404bd9ed7e26d7f7bbf01768c8074013dcca5a01d3eecca44"));
function historyRange(value) {
	if (value === "hour" || value === "day" || value === "week") return value;
	throw new Error("Choose a product and a history range.");
}
var fetchItemHistory = createServerFn({ method: "GET" }).validator((input) => {
	const id = canonicalItemId(String(input?.id ?? ""));
	if (!id) throw new Error("Choose a product and a history range.");
	return {
		id,
		range: historyRange(input?.range)
	};
}).handler(createSsrRpc("a0700fb8265dd636516e3556c9c3d477a17dbc0cbb0e845033b44b47f1ce151a"));
/**
* Multi-key sort.
* Null and blank values sort last in both directions.
* Remaining ties keep the original order (stable).
* The caller decides priority by the order of `rules` — index 0 is the primary key.
*/
function sortItems(items, rules, read) {
	const decorated = items.map((item, index) => ({
		item,
		index
	}));
	decorated.sort((left, right) => {
		for (const rule of rules) {
			const compared = compareValues(read(left.item, rule.metric), read(right.item, rule.metric), rule.direction);
			if (compared !== 0) return compared;
		}
		return left.index - right.index;
	});
	return decorated.map((entry) => entry.item);
}
function isBlank(value) {
	return value === null || value === "";
}
function compareValues(left, right, direction) {
	const leftBlank = isBlank(left);
	const rightBlank = isBlank(right);
	if (leftBlank && rightBlank) return 0;
	if (leftBlank) return 1;
	if (rightBlank) return -1;
	let result = 0;
	if (typeof left === "number" && typeof right === "number") result = left === right ? 0 : left < right ? -1 : 1;
	else result = String(left).localeCompare(String(right), "en", {
		numeric: true,
		sensitivity: "base"
	});
	return direction === "asc" ? result : -result;
}
function sanitizeSorts(raw) {
	if (!Array.isArray(raw)) return [];
	const sorts = [];
	for (const entry of raw) {
		if (!entry || typeof entry !== "object") continue;
		const row = entry;
		if (typeof row.id !== "string" || typeof row.metric !== "string" || !row.metric) continue;
		if (row.direction !== "asc" && row.direction !== "desc") continue;
		sorts.push({
			id: row.id,
			metric: row.metric,
			direction: row.direction
		});
	}
	return sorts;
}
var SETTINGS_KEY = "bazaar-desk.settings.v1";
var REFRESH_CHOICES = [
	0,
	30,
	60,
	120,
	300
];
var DEFAULT_VISIBLE = [
	"name",
	"instantBuy",
	"instantSell",
	"instantSpread",
	"instantSpreadPct",
	"estBuyValue",
	"estSellValue",
	"estValueDiff",
	"buyPerHour",
	"sellPerHour",
	"hourlyTurnover",
	"category"
];
var DEFAULT_WIDTH = {
	name: 240,
	id: 220,
	category: 140,
	rarity: 120
};
function defaultColumns() {
	return METRICS.map((metric) => ({
		id: metric.id,
		visible: DEFAULT_VISIBLE.includes(metric.id),
		width: DEFAULT_WIDTH[metric.id] ?? (metric.kind === "text" ? 160 : 124)
	}));
}
function defaultSettings(now = 0) {
	const presets = defaultPresets(now);
	const example = presets[0];
	return {
		version: 1,
		refreshSec: 60,
		taxPercent: 1.25,
		filter: example.filter,
		sorts: example.sorts,
		columns: defaultColumns(),
		presets,
		activePresetId: example.id,
		search: ""
	};
}
function taxRateFromPercent(percent) {
	return percent / 100;
}
function clampTax(value) {
	return Math.min(20, Math.max(0, typeof value === "number" && Number.isFinite(value) ? value : 1.25));
}
function clampRefresh(value) {
	const number = typeof value === "number" && Number.isFinite(value) ? value : 60;
	let best = REFRESH_CHOICES[1];
	let distance = Infinity;
	for (const choice of REFRESH_CHOICES) {
		const next = Math.abs(choice - number);
		if (next < distance) {
			distance = next;
			best = choice;
		}
	}
	return best;
}
function sanitizeColumns(raw) {
	const defaults = defaultColumns();
	const byId = /* @__PURE__ */ new Map();
	if (Array.isArray(raw)) for (const entry of raw) {
		if (!entry || typeof entry !== "object") continue;
		const row = entry;
		if (typeof row.id !== "string") continue;
		const width = typeof row.width === "number" && Number.isFinite(row.width) ? Math.min(480, Math.max(72, row.width)) : 124;
		byId.set(row.id, {
			id: row.id,
			visible: row.visible !== false,
			width
		});
	}
	const known = new Set(defaults.map((column) => column.id));
	const ordered = [];
	if (Array.isArray(raw)) for (const entry of raw) {
		if (!entry || typeof entry !== "object") continue;
		const id = entry.id;
		if (typeof id !== "string" || !known.has(id) || ordered.some((column) => column.id === id)) continue;
		const saved = byId.get(id);
		const fallback = defaults.find((column) => column.id === id);
		ordered.push(saved ? {
			...fallback,
			...saved,
			id
		} : fallback);
	}
	for (const column of defaults) if (!ordered.some((saved) => saved.id === column.id)) ordered.push(column);
	const name = ordered.find((column) => column.id === "name");
	if (name) name.visible = true;
	return ordered;
}
function sanitizePreset(raw) {
	if (!raw || typeof raw !== "object") return null;
	const row = raw;
	if (typeof row.id !== "string" || typeof row.name !== "string" || !row.name.trim()) return null;
	const filter = sanitizeNode(row.filter);
	if (!filter || filter.type !== "group") return null;
	return {
		id: row.id,
		name: row.name.trim().slice(0, 80),
		filter,
		sorts: sanitizeSorts(row.sorts),
		createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
		updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : 0
	};
}
function settingsFromUnknown(raw) {
	const defaults = defaultSettings();
	if (!raw || typeof raw !== "object") return defaults;
	const row = raw;
	const filterNode = sanitizeNode(row.filter);
	const filter = filterNode && filterNode.type === "group" ? filterNode : defaults.filter;
	const presets = Array.isArray(row.presets) ? row.presets.map(sanitizePreset).filter((preset) => preset !== null) : [];
	return {
		version: 1,
		refreshSec: clampRefresh(row.refreshSec),
		taxPercent: clampTax(row.taxPercent),
		filter,
		sorts: sanitizeSorts(row.sorts).length > 0 ? sanitizeSorts(row.sorts) : defaults.sorts,
		columns: sanitizeColumns(row.columns),
		presets: presets.length > 0 ? presets : defaults.presets,
		activePresetId: typeof row.activePresetId === "string" ? row.activePresetId : defaults.activePresetId,
		search: typeof row.search === "string" ? row.search.slice(0, 120) : ""
	};
}
function serializeSettings(settings) {
	return JSON.stringify(settings);
}
function loadSettings(raw) {
	if (!raw) return defaultSettings();
	try {
		return settingsFromUnknown(JSON.parse(raw));
	} catch {
		return defaultSettings();
	}
}
function importPresets(raw, current) {
	const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray(raw.presets) ? raw.presets : raw && typeof raw === "object" && raw.filter ? [raw] : [];
	const next = current.map((preset) => ({ ...preset }));
	for (const entry of list) {
		const preset = sanitizePreset(entry);
		if (!preset) continue;
		const index = next.findIndex((item) => item.id === preset.id);
		if (index >= 0) next[index] = preset;
		else next.push(preset);
	}
	return next;
}
/**
* Filter and sort the catalogue already in memory.
* This does not fetch. Changing a condition only re-runs this function.
*/
function applyView(items, filter, sorts, search, ctx) {
	const query = search.trim().toLowerCase();
	let rows = items;
	if (query) rows = rows.filter((item) => item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
	rows = rows.filter((item) => matches(item, filter, ctx));
	return sortItems(rows, sorts, (item, metric) => {
		return metricValue(item, metric, ctx);
	});
}
var COMPARE = [
	["gt", ">"],
	["gte", "≥"],
	["lt", "<"],
	["lte", "≤"],
	["eq", "="],
	["neq", "≠"]
];
var TEXT = [
	["contains", "contains"],
	["not_contains", "does not contain"],
	["starts", "starts with"],
	["ends", "ends with"],
	["eq", "equals"],
	["neq", "does not equal"]
];
function DeskControls({ settings, onChange }) {
	const [tab, setTab] = (0, import_react.useState)("filters");
	const fileRef = (0, import_react.useRef)(null);
	const active = settings.presets.find((preset) => preset.id === settings.activePresetId);
	const dirty = !!active && (JSON.stringify(active.filter) !== JSON.stringify(settings.filter) || JSON.stringify(active.sorts) !== JSON.stringify(settings.sorts));
	function patch(partial) {
		onChange({
			...settings,
			...partial
		});
	}
	function savePreset(name) {
		const now = Date.now();
		if (active && !name) {
			patch({ presets: settings.presets.map((preset) => preset.id === active.id ? {
				...preset,
				filter: settings.filter,
				sorts: settings.sorts,
				updatedAt: now
			} : preset) });
			return;
		}
		const preset = {
			id: newId(),
			name: name?.trim() || "Untitled preset",
			filter: settings.filter,
			sorts: settings.sorts,
			createdAt: now,
			updatedAt: now
		};
		patch({
			presets: [...settings.presets, preset],
			activePresetId: preset.id
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4 p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2",
				role: "tablist",
				"aria-label": "Desk controls",
				children: [
					["filters", "Filters"],
					["sort", "Sort"],
					["settings", "Settings"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					role: "tab",
					"aria-selected": tab === id,
					className: `btn btn-tiny flex-1 ${tab === id ? "btn-primary" : "btn-ghost"}`,
					onClick: () => setTab(id),
					children: label
				}, id))
			}),
			tab === "filters" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PresetBar, {
					settings,
					dirty,
					onChange: patch,
					onSave: () => savePreset(),
					onSaveAs: () => {
						const name = window.prompt("Preset name", "New preset");
						if (name) savePreset(name);
					},
					onImport: () => fileRef.current?.click()
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: fileRef,
					type: "file",
					accept: "application/json",
					className: "hidden",
					onChange: async (event) => {
						const file = event.target.files?.[0];
						event.target.value = "";
						if (!file) return;
						try {
							patch({ presets: importPresets(JSON.parse(await file.text()), settings.presets) });
						} catch {
							window.alert("That file is not a preset export.");
						}
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Conditions run together on the catalogue already loaded. Missing numbers never count as zero, and Exclude does not let a missing value through."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupEditor, {
					group: settings.filter,
					depth: 0,
					onChange: (filter) => patch({ filter })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn",
							onClick: () => patch({ filter: addCondition(settings.filter) }),
							children: "Add condition"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn",
							onClick: () => patch({ filter: addGroup(settings.filter) }),
							children: "Add group"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn btn-ghost",
							onClick: () => patch({ filter: emptyGroup(newId()) }),
							children: "Clear"
						})
					]
				})
			] }) : null,
			tab === "sort" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortEditor, {
				sorts: settings.sorts,
				onChange: (sorts) => patch({ sorts })
			}) : null,
			tab === "settings" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsEditor, {
				settings,
				onChange: patch
			}) : null
		]
	});
}
function PresetBar({ settings, dirty, onChange, onSave, onSaveAs, onImport }) {
	const active = settings.presets.find((preset) => preset.id === settings.activePresetId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-xs font-medium tracking-wide text-muted uppercase",
				children: ["Preset", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: "field mt-1",
					value: settings.activePresetId ?? "",
					onChange: (event) => {
						const preset = settings.presets.find((item) => item.id === event.target.value);
						if (!preset) return;
						onChange({
							activePresetId: preset.id,
							filter: preset.filter,
							sorts: preset.sorts
						});
					},
					children: settings.presets.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: preset.id,
						children: preset.name
					}, preset.id))
				})]
			}),
			dirty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-warn",
				children: "Unsaved changes to this preset."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn",
						onClick: onSave,
						disabled: !active,
						children: "Save"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn",
						onClick: onSaveAs,
						children: "Save as"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn",
						onClick: () => {
							if (!active) return;
							const name = window.prompt("Rename preset", active.name);
							if (!name?.trim()) return;
							onChange({ presets: settings.presets.map((preset) => preset.id === active.id ? {
								...preset,
								name: name.trim(),
								updatedAt: Date.now()
							} : preset) });
						},
						children: "Rename"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn",
						onClick: () => {
							if (!active) return;
							const copy = {
								...active,
								id: newId(),
								name: `${active.name} copy`,
								createdAt: Date.now(),
								updatedAt: Date.now()
							};
							onChange({
								presets: [...settings.presets, copy],
								activePresetId: copy.id,
								filter: copy.filter,
								sorts: copy.sorts
							});
						},
						children: "Duplicate"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn",
						onClick: () => {
							if (!active) return;
							const presets = settings.presets.filter((preset) => preset.id !== active.id);
							const next = presets[0];
							onChange({
								presets: presets.length > 0 ? presets : defaultSettings().presets,
								activePresetId: next?.id ?? defaultSettings().activePresetId,
								filter: next?.filter ?? emptyGroup(newId()),
								sorts: next?.sorts ?? []
							});
						},
						children: "Delete"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn",
						onClick: () => {
							const blob = new Blob([JSON.stringify({ presets: settings.presets }, null, 2)], { type: "application/json" });
							const url = URL.createObjectURL(blob);
							const link = document.createElement("a");
							link.href = url;
							link.download = "bazaar-desk-presets.json";
							link.click();
							URL.revokeObjectURL(url);
						},
						children: "Export"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn",
						onClick: onImport,
						children: "Import"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-ghost",
						onClick: () => onChange(defaultSettings(Date.now())),
						children: "Restore defaults"
					})
				]
			})
		]
	});
}
function GroupEditor({ group, depth, onChange, onRemove }) {
	const pad = [
		"pl-0",
		"pl-3",
		"pl-6",
		"pl-8"
	][Math.min(depth, 3)];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `${pad} flex flex-col gap-2 border-l border-border`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2 pl-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "field w-auto",
						"aria-label": "Group logic",
						value: group.logic,
						onChange: (event) => onChange({
							...group,
							logic: event.target.value === "or" ? "or" : "and"
						}),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "and",
							children: "All of these"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "or",
							children: "Any of these"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-h-11 items-center gap-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: group.negate,
							onChange: (event) => onChange({
								...group,
								negate: event.target.checked
							})
						}), "Exclude group"]
					}),
					onRemove ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-tiny btn-ghost",
						onClick: onRemove,
						children: "Remove group"
					}) : null
				]
			}),
			group.children.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "pl-3 text-sm text-muted",
				children: group.logic === "and" ? "Empty group matches every product." : "Empty group matches nothing."
			}) : null,
			group.children.map((child, index) => isGroup(child) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupEditor, {
				group: child,
				depth: depth + 1,
				onChange: (next) => onChange(replaceChild(group, index, next)),
				onRemove: () => onChange(removeChild(group, index))
			}, child.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConditionRow, {
				condition: child,
				onChange: (next) => onChange(replaceChild(group, index, next)),
				onRemove: () => onChange(removeChild(group, index)),
				onUp: () => onChange(moveChild(group, index, -1)),
				onDown: () => onChange(moveChild(group, index, 1))
			}, child.id)),
			depth > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2 pl-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "btn btn-tiny",
					onClick: () => onChange(addCondition(group)),
					children: "Add condition"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "btn btn-tiny",
					onClick: () => onChange(addGroup(group)),
					children: "Add group"
				})]
			}) : null
		]
	});
}
function ConditionRow({ condition, onChange, onRemove, onUp, onDown }) {
	const def = METRIC_BY_ID.get(condition.metric);
	const textMetric = def?.kind === "text";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "ml-3 flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-fg",
				children: describeCondition(condition)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				className: "field",
				"aria-label": "Metric",
				value: condition.metric,
				onChange: (event) => onChange(retarget(condition, event.target.value)),
				children: METRIC_GROUPS.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("optgroup", {
					label: group,
					children: METRICS.filter((metric) => metric.group === group).map((metric) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: metric.id,
						children: metric.label
					}, metric.id))
				}, group))
			}),
			def ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs leading-5 text-muted",
				children: def.description
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-2 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: "field",
						"aria-label": "Operator",
						value: operatorValue(condition),
						onChange: (event) => onChange(withOperator(condition, event.target.value)),
						children: [
							textMetric ? TEXT.map(([op, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: op,
								children: label
							}, op)) : COMPARE.map(([op, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: op,
								children: label
							}, op)),
							!textMetric ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "between",
								children: "between"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "outside",
								children: "outside"
							})] }) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "available",
								children: "is available"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "unavailable",
								children: "is unavailable"
							})
						]
					}),
					condition.type === "compare" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field font-mono",
						"aria-label": "Threshold",
						value: condition.text,
						placeholder: "180 or 5M",
						onChange: (event) => onChange({
							...condition,
							text: event.target.value,
							value: parseUserNumber(event.target.value)
						})
					}) : null,
					condition.type === "text" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						"aria-label": "Text",
						value: condition.value,
						onChange: (event) => onChange({
							...condition,
							value: event.target.value
						})
					}) : null
				]
			}),
			condition.type === "range" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field font-mono",
					"aria-label": "Minimum",
					value: condition.minText,
					placeholder: "Min",
					onChange: (event) => onChange({
						...condition,
						minText: event.target.value,
						min: parseUserNumber(event.target.value)
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field font-mono",
					"aria-label": "Maximum",
					value: condition.maxText,
					placeholder: "Max",
					onChange: (event) => onChange({
						...condition,
						maxText: event.target.value,
						max: parseUserNumber(event.target.value)
					})
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-h-11 items-center gap-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: !!condition.negate,
							onChange: (event) => onChange({
								...condition,
								negate: event.target.checked
							})
						}), "Exclude"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-tiny",
						onClick: onUp,
						"aria-label": "Move condition up",
						children: "Up"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-tiny",
						onClick: onDown,
						"aria-label": "Move condition down",
						children: "Down"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-tiny btn-ghost",
						onClick: onRemove,
						children: "Remove"
					})
				]
			})
		]
	});
}
function SortEditor({ sorts, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "The first rule wins. Later rules break ties. Blank values always sort last. If everything is still equal, the original order is kept."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-2",
				children: SORT_SHORTCUTS.map((shortcut) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "btn justify-start",
					onClick: () => onChange(shortcut.sorts),
					children: shortcut.label
				}, shortcut.id))
			}),
			sorts.map((rule, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-primary",
						children: index + 1
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: "field",
						"aria-label": `Sort metric ${index + 1}`,
						value: rule.metric,
						onChange: (event) => onChange(sorts.map((item, itemIndex) => itemIndex === index ? {
							...item,
							metric: event.target.value
						} : item)),
						children: METRIC_GROUPS.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("optgroup", {
							label: group,
							children: METRICS.filter((metric) => metric.group === group).map((metric) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: metric.id,
								children: metric.label
							}, metric.id))
						}, group))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn btn-tiny",
								onClick: () => onChange(sorts.map((item, itemIndex) => itemIndex === index ? {
									...item,
									direction: item.direction === "asc" ? "desc" : "asc"
								} : item)),
								children: rule.direction === "asc" ? "Ascending" : "Descending"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn btn-tiny",
								onClick: () => onChange(move(sorts, index, -1)),
								"aria-label": "Raise priority",
								children: "Up"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn btn-tiny",
								onClick: () => onChange(move(sorts, index, 1)),
								"aria-label": "Lower priority",
								children: "Down"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "btn btn-tiny btn-ghost",
								onClick: () => onChange(sorts.filter((_, itemIndex) => itemIndex !== index)),
								children: "Remove"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: metricLabel(rule.metric)
					})
				]
			}, rule.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "btn",
				onClick: () => onChange([...sorts, {
					id: newId(),
					metric: "instantSpread",
					direction: "desc"
				}]),
				children: "Add sort rule"
			})
		]
	});
}
function SettingsEditor({ settings, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm text-muted",
				children: ["Refresh", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "field mt-1",
					value: settings.refreshSec,
					onChange: (event) => onChange({ refreshSec: Number(event.target.value) }),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: 0,
							children: "Manual only"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: 30,
							children: "Every 30 seconds"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: 60,
							children: "Every minute"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: 120,
							children: "Every 2 minutes"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: 300,
							children: "Every 5 minutes"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm text-muted",
				children: ["Bazaar tax %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field mt-1 font-mono",
					inputMode: "decimal",
					value: settings.taxPercent,
					onChange: (event) => {
						const value = Number(event.target.value);
						if (Number.isFinite(value)) onChange({ taxPercent: Math.min(20, Math.max(0, value)) });
					}
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Used only by the “instant round trip after tax” metric. Hourly volume is always the seven-day average, week divided by 168, even if you refresh faster than that."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ColumnPicker, {
				columns: settings.columns,
				onChange: (columns) => onChange({ columns })
			})
		]
	});
}
function ColumnPicker({ columns, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex max-h-80 flex-col gap-1 overflow-auto rounded-md border border-border p-2",
		children: columns.map((column, index) => {
			const def = METRIC_BY_ID.get(column.id);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex min-h-11 flex-1 items-center gap-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: column.visible,
							disabled: column.id === "name",
							onChange: (event) => onChange(columns.map((item) => item.id === column.id ? {
								...item,
								visible: event.target.checked
							} : item))
						}), def?.short ?? column.id]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-tiny",
						onClick: () => onChange(move(columns, index, -1)),
						"aria-label": "Move column left",
						children: "Left"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-tiny",
						onClick: () => onChange(move(columns, index, 1)),
						"aria-label": "Move column right",
						children: "Right"
					})
				]
			}, column.id);
		})
	});
}
function SourceList({ sources }) {
	if (sources.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "flex flex-col gap-2",
		children: sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "rounded-md border border-border bg-surface px-3 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-medium",
					children: source.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-xs text-muted uppercase",
					children: source.status
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs leading-5 text-muted",
				children: source.detail
			})]
		}, source.id))
	});
}
function replaceChild(group, index, child) {
	const children = group.children.slice();
	children[index] = child;
	return {
		...group,
		children
	};
}
function removeChild(group, index) {
	return {
		...group,
		children: group.children.filter((_, itemIndex) => itemIndex !== index)
	};
}
function moveChild(group, index, delta) {
	return {
		...group,
		children: move(group.children, index, delta)
	};
}
function move(list, index, delta) {
	const target = index + delta;
	if (target < 0 || target >= list.length) return list;
	const next = list.slice();
	const [item] = next.splice(index, 1);
	next.splice(target, 0, item);
	return next;
}
function addCondition(group) {
	const condition = {
		type: "compare",
		id: newId(),
		metric: "buyPerHour",
		op: "gt",
		value: null,
		text: ""
	};
	return {
		...group,
		children: [...group.children, condition]
	};
}
function addGroup(group) {
	return {
		...group,
		children: [...group.children, {
			type: "group",
			id: newId(),
			logic: "or",
			negate: false,
			children: []
		}]
	};
}
function retarget(condition, metric) {
	if ((METRIC_BY_ID.get(metric)?.kind ?? "number") === "text") return {
		type: "text",
		id: condition.id,
		metric,
		op: "contains",
		value: "",
		negate: condition.negate
	};
	if (condition.type === "text" || condition.type === "presence") return {
		type: "compare",
		id: condition.id,
		metric,
		op: "gt",
		value: null,
		text: "",
		negate: condition.negate
	};
	return {
		...condition,
		metric
	};
}
function operatorValue(condition) {
	return condition.op;
}
function withOperator(condition, op) {
	if (op === "available" || op === "unavailable") return {
		type: "presence",
		id: condition.id,
		metric: condition.metric,
		op,
		negate: condition.negate
	};
	if (op === "between" || op === "outside") {
		const min = condition.type === "range" ? condition.min : condition.type === "compare" ? condition.value : null;
		const max = condition.type === "range" ? condition.max : null;
		return {
			type: "range",
			id: condition.id,
			metric: condition.metric,
			op,
			min,
			max,
			minText: condition.type === "range" ? condition.minText : condition.type === "compare" ? condition.text : "",
			maxText: condition.type === "range" ? condition.maxText : "",
			negate: condition.negate
		};
	}
	if (METRIC_BY_ID.get(condition.metric)?.kind === "text") return {
		type: "text",
		id: condition.id,
		metric: condition.metric,
		op,
		value: condition.type === "text" ? condition.value : "",
		negate: condition.negate
	};
	return {
		type: "compare",
		id: condition.id,
		metric: condition.metric,
		op,
		value: condition.type === "compare" ? condition.value : condition.type === "range" ? condition.min : null,
		text: condition.type === "compare" ? condition.text : condition.type === "range" ? condition.minText : "",
		negate: condition.negate
	};
}
function readMetric(item, id, ctx) {
	return metricValue(item, id, ctx);
}
function formatMetric(id, value) {
	if (value === null || value === "") return "—";
	const def = METRIC_BY_ID.get(id);
	if (typeof value === "string") return value;
	if (!def) return formatExact(value, 2);
	if (def.unit === "percent") return formatPct(value);
	if (def.unit === "coins") return formatCoins(value);
	if (def.unit === "hours") return formatExact(value, 2);
	if (def.unit === "count") return formatExact(value, 0);
	return formatQty(value);
}
function toneClass(def, value) {
	if (!def || typeof value !== "number") return "text-fg";
	if (def.tone === "change" || def.tone === "pnl") {
		if (value > 0) return "text-up";
		if (value < 0) return "text-down";
	}
	return "text-fg";
}
function ItemDetail({ item, ctx, filter, snaps, onClose }) {
	const [range, setRange] = (0, import_react.useState)("day");
	const [raw, setRaw] = (0, import_react.useState)(false);
	const history = useQuery({
		queryKey: [
			"bazaar-history",
			item.id,
			range
		],
		queryFn: () => fetchItemHistory({ data: {
			id: item.id,
			range
		} })
	});
	const local = seriesFor(item.id, snaps).map((point) => ({
		t: point.at,
		buy: point.weightedBuy,
		sell: point.weightedSell
	}));
	const cofl = history.data?.points ?? [];
	const coflStats = coflWindowStats(cofl);
	const latest = cofl[cofl.length - 1];
	const buyGap = priceGap(item.buy.weightedPrice, latest?.buy ?? null);
	const sellGap = priceGap(item.sell.weightedPrice, latest?.sell ?? null);
	const reason = explain(item, filter, ctx);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-40 flex justify-end bg-bg/70",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "absolute inset-0",
			"aria-label": "Close product",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "product-title",
			className: "relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-surface",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-primary",
						children: item.id
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "product-title",
						className: "text-xl font-semibold tracking-tight",
						children: item.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: [item.rarity, item.category].filter(Boolean).join(" · ") || "Category and rarity unavailable"
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "btn btn-tiny",
					onClick: onClose,
					children: "Close"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-6 px-4 py-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mb-2 text-sm font-semibold",
							children: "Why this row is in the results"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-sm text-muted",
							children: summarize(filter)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExplainTree, { node: reason })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuoteGrid, {
						item,
						ctx
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "grid gap-4 md:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Book, {
							title: "Instant-buy side",
							note: "buy_summary, cheapest first in the math. Not the whole book.",
							levels: item.buy.levels
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Book, {
							title: "Instant-sell side",
							note: "sell_summary. Highest bid is the instant-sell price.",
							levels: [...item.sell.levels].sort((a, b) => b.pricePerUnit - a.pricePerUnit)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mb-1 text-sm font-semibold",
							children: "Your stored scans"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-sm text-muted",
							children: "Weighted buy and sell from scans this browser kept. Order-book quantity changes are not treated as trades."
						}),
						local.length < 2 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-warn",
							children: "Unavailable until at least two different Hypixel updates have been stored."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chart, { data: local })
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 flex flex-wrap items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-semibold",
								children: "SkyCofl history"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "field w-auto",
								value: range,
								onChange: (event) => setRange(event.target.value),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "hour",
										children: "Last hour"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "day",
										children: "Last day"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "week",
										children: "Last week"
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mb-2 text-sm text-muted",
							children: [
								"Their buy and sell fields track Hypixel’s weighted prices. Their volume fields on these points are order-book snapshots, not units traded in the bucket.",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									className: "text-primary",
									href: `https://sky.coflnet.com/item/${encodeURIComponent(item.id)}`,
									target: "_blank",
									rel: "noreferrer",
									children: "SkyCofl"
								})
							]
						}),
						history.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm",
							children: "Loading SkyCofl history…"
						}) : null,
						history.data && !history.data.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-down",
							children: history.data.error
						}) : null,
						history.data?.ok && cofl.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-warn",
							children: "SkyCofl returned no points."
						}) : null,
						cofl.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chart, { data: cofl.map((point) => ({
							t: point.at,
							buy: point.buy,
							sell: point.sell
						})) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-3 grid grid-cols-2 gap-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
									label: "Buy change",
									value: formatMetric("weightedBuyChangePct", coflStats.buyChangePct)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
									label: "Sell change",
									value: formatMetric("weightedSellChangePct", coflStats.sellChangePct)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
									label: "Buy average",
									value: formatMetric("weightedBuy", coflStats.buyAvg)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
									label: "Sell average",
									value: formatMetric("weightedSell", coflStats.sellAvg)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
									label: "Buy volatility",
									value: formatMetric("buyVolatilityPct", coflStats.buyVolatilityPct)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
									label: "Sell volatility",
									value: formatMetric("sellVolatilityPct", coflStats.sellVolatilityPct)
								})
							]
						})] }) : null,
						latest ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 rounded-md border border-border p-3 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: "Source check, not a blend"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-muted",
									children: [
										"Hypixel weighted buy ",
										formatExact(item.buy.weightedPrice),
										" versus SkyCofl ",
										formatExact(latest.buy),
										" (",
										buyGap ? `${buyGap.pct.toFixed(2)}%` : "unavailable",
										"). Weighted sell ",
										formatExact(item.sell.weightedPrice),
										" versus",
										" ",
										formatExact(latest.sell),
										" (",
										sellGap ? `${sellGap.pct.toFixed(2)}%` : "unavailable",
										"). Timestamps differ, so a small gap is expected."
									]
								}),
								item.alternateName ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-warn",
									children: [
										"Name disagreement: Hypixel says “",
										item.name,
										"”, SkyCofl says “",
										item.alternateName,
										"”. The Hypixel name is shown."
									]
								}) : null
							]
						}) : null
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn",
						onClick: () => setRaw((value) => !value),
						children: raw ? "Hide raw payload" : "Show raw payload"
					}), raw ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mt-3 overflow-auto rounded-md bg-bg p-3 font-mono text-xs leading-5",
						children: JSON.stringify(rawPayload(item), null, 2)
					}) : null] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-2 text-sm font-semibold",
						children: "Every metric"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
						className: "flex flex-col",
						children: METRICS.map((metric) => {
							const value = readMetric(item, metric.id, ctx);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2 border-b border-border py-2 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
									className: "text-muted",
									title: metric.description,
									children: metric.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
									className: `text-right font-mono ${toneClass(metric, value)}`,
									children: formatMetric(metric.id, value)
								})]
							}, metric.id);
						})
					})] })
				]
			})]
		})]
	});
}
function ExplainTree({ node }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border-l border-border pl-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: `text-sm ${node.pass ? "text-up" : "text-down"}`,
			children: [
				node.pass ? "Met" : "Not met",
				" — ",
				node.label
			]
		}), node.children?.map((child) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExplainTree, { node: child }, child.id))]
	});
}
function QuoteGrid({ item, ctx }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
		className: "grid grid-cols-2 gap-2 sm:grid-cols-3",
		children: [
			"instantBuy",
			"instantSell",
			"instantSpread",
			"instantSpreadPct",
			"buyPerHour",
			"sellPerHour",
			"estBuyValue",
			"estSellValue",
			"hourlyTurnover"
		].map((id) => {
			const metric = METRICS.find((entry) => entry.id === id);
			const value = readMetric(item, id, ctx);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-md border border-border bg-bg px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
					className: "text-xs text-muted",
					children: metric?.short
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
					className: `font-mono text-sm ${toneClass(metric, value)}`,
					children: formatMetric(id, value)
				})]
			}, id);
		})
	});
}
function Book({ title, note, levels }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-sm font-semibold",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-2 text-xs text-muted",
			children: note
		}),
		levels.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-warn",
			children: "No levels returned."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full text-left text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "text-xs text-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "py-1 font-medium",
						children: "Price"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "py-1 font-medium",
						children: "Amount"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "py-1 font-medium",
						children: "Orders"
					})
				] })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
				className: "font-mono",
				children: levels.map((level, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-1",
							children: formatExact(level.pricePerUnit, 2)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-1",
							children: formatExact(level.amount, 0)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-1",
							children: formatExact(level.orders, 0)
						})
					]
				}, `${level.pricePerUnit}-${index}`))
			})]
		})
	] });
}
function Chart({ data }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-56 w-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
				data,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
						stroke: "var(--color-border)",
						vertical: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						dataKey: "t",
						tickFormatter: (value) => formatClock(Number(value)),
						stroke: "var(--color-muted)",
						fontSize: 11,
						minTickGap: 24
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						stroke: "var(--color-muted)",
						fontSize: 11,
						width: 56
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						contentStyle: {
							background: "var(--color-surface)",
							border: "1px solid var(--color-border)"
						},
						labelFormatter: (value) => formatClock(Number(value))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						type: "monotone",
						dataKey: "buy",
						name: "Buy",
						stroke: "var(--color-primary)",
						dot: false,
						connectNulls: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						type: "monotone",
						dataKey: "sell",
						name: "Sell",
						stroke: "var(--color-up)",
						dot: false,
						connectNulls: false
					})
				]
			})
		})
	});
}
function Stat$1({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-border px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "font-mono",
			children: value
		})]
	});
}
function rawPayload(item) {
	return {
		product_id: item.id,
		name: {
			value: item.name,
			source: item.nameSource,
			alternate: item.alternateName
		},
		category: {
			value: item.category,
			source: item.categorySource
		},
		rarity: item.rarity,
		npc_sell_price: item.npcSellPrice,
		quick_status: {
			buyPrice: item.buy.weightedPrice,
			sellPrice: item.sell.weightedPrice,
			buyVolume: item.buy.orderQty,
			sellVolume: item.sell.orderQty,
			buyOrders: item.buy.orderCount,
			sellOrders: item.sell.orderCount,
			buyMovingWeek: item.buyWeek,
			sellMovingWeek: item.sellWeek
		},
		buy_summary: item.buy.levels,
		sell_summary: item.sell.levels,
		hypixelUpdatedAt: item.hypixelUpdatedAt
	};
}
var ROW = 44;
function ResultsTable({ rows, columns, sorts, ctx, selectedId, compareIds, onSort, onOpen, onToggleCompare, onResize }) {
	const parentRef = (0, import_react.useRef)(null);
	const visible = columns.filter((column) => column.visible);
	const width = 52 + visible.reduce((sum, column) => sum + column.width, 0);
	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW,
		overscan: 10
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: parentRef,
		className: "h-full min-h-0 overflow-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				width,
				minWidth: "100%"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sticky top-0 z-10 flex h-11 border-b border-border bg-surface text-xs tracking-wide text-muted uppercase",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex w-12 shrink-0 items-center justify-center",
					children: "Pick"
				}), visible.map((column) => {
					const ruleIndex = sorts.findIndex((rule) => rule.metric === column.id);
					const rule = ruleIndex >= 0 ? sorts[ruleIndex] : void 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex shrink-0 items-center",
						style: { width: column.width },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "flex h-11 w-full items-center px-2 text-left",
							onClick: () => onSort(column.id),
							title: METRIC_BY_ID.get(column.id)?.description,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: METRIC_BY_ID.get(column.id)?.short ?? column.id
							}), rule ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ml-1 font-mono text-primary",
								children: [rule.direction === "asc" ? "↑" : "↓", sorts.length > 1 ? ruleIndex + 1 : ""]
							}) : null]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							role: "separator",
							"aria-orientation": "vertical",
							"aria-label": `Resize ${column.id}`,
							className: "absolute top-0 right-0 h-11 w-2 cursor-col-resize",
							onPointerDown: (event) => {
								event.preventDefault();
								event.stopPropagation();
								const startX = event.clientX;
								const startW = column.width;
								const move = (ev) => {
									onResize(column.id, Math.min(480, Math.max(88, startW + ev.clientX - startX)));
								};
								const up = () => {
									window.removeEventListener("pointermove", move);
									window.removeEventListener("pointerup", up);
								};
								window.addEventListener("pointermove", move);
								window.addEventListener("pointerup", up);
							}
						})]
					}, column.id);
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative",
				style: { height: virtualizer.getTotalSize() },
				children: virtualizer.getVirtualItems().map((virtualRow) => {
					const item = rows[virtualRow.index];
					if (!item) return null;
					const open = item.id === selectedId;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `absolute top-0 left-0 flex border-b border-border ${open ? "bg-surface-3" : "bg-bg"}`,
						style: {
							height: virtualRow.size,
							transform: `translateY(${virtualRow.start}px)`,
							width
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex w-12 shrink-0 items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "size-4",
								"aria-label": `Compare ${item.name}`,
								checked: compareIds.includes(item.id),
								onChange: () => onToggleCompare(item.id)
							})
						}), visible.map((column) => {
							const value = readMetric(item, column.id, ctx);
							const def = METRIC_BY_ID.get(column.id);
							const text = formatMetric(column.id, value);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `flex h-11 shrink-0 items-center px-2 text-left text-sm ${column.id === "name" ? "font-medium" : "font-mono"} ${toneClass(def, value)}`,
								style: { width: column.width },
								onClick: () => onOpen(item.id),
								title: text === "—" ? "Unavailable" : text,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate",
									children: text
								})
							}, column.id);
						})]
					}, item.id);
				})
			})]
		})
	});
}
var COMPARE_IDS = [
	"name",
	"instantBuy",
	"instantSell",
	"instantSpreadPct",
	"estBuyValue",
	"estSellValue",
	"estValueDiff",
	"buyPerHour",
	"sellPerHour",
	"hourlyTurnover"
];
function Desk() {
	const [settings, setSettings] = (0, import_react.useState)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [historyReady, setHistoryReady] = (0, import_react.useState)(false);
	const [snaps, setSnaps] = (0, import_react.useState)([]);
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const [compareIds, setCompareIds] = (0, import_react.useState)([]);
	const [filtersOpen, setFiltersOpen] = (0, import_react.useState)(false);
	const [sourcesOpen, setSourcesOpen] = (0, import_react.useState)(false);
	const [compareOpen, setCompareOpen] = (0, import_react.useState)(false);
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const client = useQueryClient();
	(0, import_react.useEffect)(() => {
		setSettings(loadSettings(localStorage.getItem(SETTINGS_KEY)));
		setReady(true);
		loadStoredSnapshots().then((stored) => {
			setSnaps(stored);
			setHistoryReady(true);
		});
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready || !settings) return;
		localStorage.setItem(SETTINGS_KEY, serializeSettings(settings));
	}, [ready, settings]);
	(0, import_react.useEffect)(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1e3);
		return () => window.clearInterval(timer);
	}, []);
	const refreshMs = settings && settings.refreshSec > 0 ? settings.refreshSec * 1e3 : false;
	const scan = useQuery({
		queryKey: ["bazaar-scan"],
		queryFn: () => scanBazaar({ data: { force: false } }),
		refetchInterval: refreshMs,
		enabled: ready
	});
	(0, import_react.useEffect)(() => {
		if (!historyReady) return;
		const data = scan.data;
		if (!data?.ok || data.items.length === 0) return;
		const stamp = data.hypixelUpdatedAt ?? data.scannedAt;
		setSnaps((previous) => {
			if (previous.some((snap) => snap.at === stamp)) return previous;
			const nextSnap = snapshotFromProducts(data.items, stamp);
			rememberSnapshot(previous, nextSnap).then((stored) => {
				setSnaps((current) => appendSnapshot(current, stored[stored.length - 1] ?? nextSnap));
			});
			return appendSnapshot(previous, nextSnap);
		});
	}, [scan.data, historyReady]);
	const taxPercent = settings?.taxPercent ?? 1.25;
	const ctx = (0, import_react.useMemo)(() => ({ taxRate: taxRateFromPercent(taxPercent) }), [taxPercent]);
	const catalogue = (0, import_react.useMemo)(() => scan.data?.ok ? scan.data.items : [], [scan.data]);
	const viewedItems = (0, import_react.useMemo)(() => decorateWithHistory(catalogue, snaps), [catalogue, snaps]);
	const rows = (0, import_react.useMemo)(() => {
		if (!settings) return [];
		return applyView(viewedItems, settings.filter, settings.sorts, settings.search, ctx);
	}, [
		viewedItems,
		settings,
		ctx
	]);
	const selected = viewedItems.find((item) => item.id === selectedId) ?? null;
	const health = catalogueHealth(catalogue);
	const conditions = settings ? countConditions(settings.filter) : 0;
	function patch(partial) {
		setSettings((current) => current ? {
			...current,
			...partial
		} : current);
	}
	function resort(metric) {
		if (!settings) return;
		const first = settings.sorts[0];
		let sorts;
		if (first?.metric === metric) {
			const direction = first.direction === "asc" ? "desc" : "asc";
			sorts = [{
				...first,
				direction
			}, ...settings.sorts.slice(1)];
		} else sorts = [{
			id: newId(),
			metric,
			direction: "desc"
		}, ...settings.sorts.filter((rule) => rule.metric !== metric)].slice(0, 6);
		patch({ sorts });
	}
	function resize(id, width) {
		if (!settings) return;
		patch({ columns: settings.columns.map((column) => column.id === id ? {
			...column,
			width
		} : column) });
	}
	function toggleCompare(id) {
		setCompareIds((current) => {
			if (current.includes(id)) return current.filter((item) => item !== id);
			if (current.length >= 4) return current;
			return [...current, id];
		});
	}
	function download(kind) {
		if (!settings) return;
		const csv = toCsv(kind === "view" ? rows : viewedItems, kind === "view" ? settings.columns.filter((column) => column.visible).map((column) => column.id) : METRICS.map((metric) => metric.id), ctx);
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = kind === "view" ? "bazaar-desk-filtered.csv" : "bazaar-desk-catalogue.csv";
		link.click();
		URL.revokeObjectURL(url);
	}
	const status = !scan.data ? scan.isError ? "Scan failed" : "Scanning" : scan.data.ok ? scan.isFetching ? "Refreshing" : "Live" : "Unavailable";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex flex-wrap items-center gap-3 border-b border-border px-4 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mr-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-xs tracking-widest text-primary",
							children: "HYPIXEL SKYBLOCK"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-lg font-semibold tracking-tight",
							children: "Bazaar Desk"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/guide",
						className: "btn btn-tiny btn-ghost",
						children: "Metric guide"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-tiny lg:hidden",
						onClick: () => setFiltersOpen(true),
						children: "Filters"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-primary btn-tiny",
						onClick: () => {
							client.fetchQuery({
								queryKey: ["bazaar-scan"],
								queryFn: () => scanBazaar({ data: { force: true } })
							});
						},
						children: "Refresh"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-wrap gap-x-5 gap-y-2 border-b border-border px-4 py-3 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Catalogue",
						value: catalogue.length ? catalogue.length.toLocaleString("en-US") : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Matching",
						value: settings ? rows.length.toLocaleString("en-US") : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Status",
						value: status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Hypixel age",
						value: formatAge(scan.data?.hypixelUpdatedAt ?? null, now)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Last scan",
						value: formatClock(scan.data?.scannedAt ?? null)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Empty buy side",
						value: catalogue.length ? String(health.emptyBuy) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Empty sell side",
						value: catalogue.length ? String(health.emptySell) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Missing quotes",
						value: catalogue.length ? String(health.missingQuotes) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "btn btn-tiny",
						onClick: () => setSourcesOpen(true),
						children: "Sources"
					})
				]
			}),
			settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "border-b border-border px-4 py-2 text-sm text-muted",
				children: [conditions === 0 ? "No filter — the full loaded catalogue." : `${conditions} conditions: ${summarize(settings.filter)}`, settings.sorts.length > 0 ? ` Sorted by ${settings.sorts.map((rule) => `${metricLabel(rule.metric)} ${rule.direction === "asc" ? "↑" : "↓"}`).join(", then ")}.` : ""]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "border-b border-border px-4 py-2 text-sm",
				children: "Restoring your filters…"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
					className: "hidden w-96 shrink-0 overflow-y-auto border-r border-border lg:block",
					children: settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskControls, {
						settings,
						onChange: (next) => setSettings(next)
					}) : null
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
					className: "flex min-w-0 flex-1 flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2 border-b border-border px-3 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "field max-w-md",
									placeholder: "Search name or ID",
									value: settings?.search ?? "",
									onChange: (event) => patch({ search: event.target.value }),
									"aria-label": "Search products"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "btn btn-tiny",
									onClick: () => download("view"),
									disabled: rows.length === 0,
									children: "Export view"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "btn btn-tiny",
									onClick: () => download("all"),
									disabled: viewedItems.length === 0,
									children: "Export catalogue"
								}),
								compareIds.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									className: "btn btn-tiny",
									onClick: () => setCompareOpen(true),
									children: ["Compare ", compareIds.length]
								}) : null
							]
						}),
						!settings || scan.isPending && catalogue.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-4 py-8 text-sm",
							children: "Scanning the Hypixel Bazaar. The full catalogue loads before any filter runs."
						}) : null,
						scan.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-4 py-6 text-sm text-down",
							children: "The scan request failed. Refresh to try again. Nothing was filled in with zeros."
						}) : null,
						scan.data && !scan.data.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-4 py-6 text-sm text-down",
							children: scan.data.error
						}) : null,
						settings && scan.data?.ok && rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-4 py-8",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-lg font-semibold",
									children: "No products match"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 max-w-xl text-sm text-muted",
									children: [
										"The catalogue has ",
										catalogue.length.toLocaleString("en-US"),
										" products. Estimated order value is full-book quantity times the top-2% weighted price, so the example 5M–15M band is tight. Widen it, switch the metric to the visible summary value, or browse everything."
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "btn btn-primary mt-4",
									onClick: () => {
										const preset = allProductsPreset(Date.now());
										patch({
											filter: preset.filter,
											sorts: preset.sorts,
											activePresetId: "all-products"
										});
									},
									children: "Show entire catalogue"
								})
							]
						}) : null,
						settings && rows.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultsTable, {
							rows,
							columns: settings.columns,
							sorts: settings.sorts,
							ctx,
							selectedId,
							compareIds,
							onSort: resort,
							onOpen: setSelectedId,
							onToggleCompare: toggleCompare,
							onResize: resize
						}) : null
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: filtersOpen,
				onOpenChange: setFiltersOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-lg border border-border bg-surface",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-4 pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
							className: "text-lg font-semibold",
							children: "Filters and sort"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
							className: "btn btn-tiny",
							children: "Done"
						})]
					}), settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskControls, {
						settings,
						onChange: (next) => setSettings(next)
					}) : null]
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: sourcesOpen,
				onOpenChange: setSourcesOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "fixed top-1/2 left-1/2 z-50 max-h-[80dvh] w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
							className: "mb-3 text-lg font-semibold",
							children: "Sources"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceList, { sources: scan.data?.sources ?? [] }),
						scan.data?.warnings?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 text-sm text-warn",
							children: scan.data.warnings.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: warning }, warning))
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
							className: "btn mt-4",
							children: "Close"
						})
					]
				})] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: compareOpen,
				onOpenChange: setCompareOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-bg/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "fixed top-1/2 left-1/2 z-50 max-h-[80dvh] w-[min(56rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
							className: "mb-3 text-lg font-semibold",
							children: "Compare"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CompareTable, {
							items: viewedItems.filter((item) => compareIds.includes(item.id)),
							ctx
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
							className: "btn mt-4",
							children: "Close"
						})
					]
				})] })
			}),
			selected && settings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemDetail, {
				item: selected,
				ctx,
				filter: settings.filter,
				snaps,
				onClose: () => setSelectedId(null)
			}) : null
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted",
			children: label
		}),
		" ",
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-mono",
			children: value
		})
	] });
}
function CompareTable({ items, ctx }) {
	if (items.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Pick up to four products in the table."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full text-left text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
				className: "py-2 pr-3 font-medium text-muted",
				children: "Metric"
			}), items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
				className: "py-2 pr-3 font-medium",
				children: item.name
			}, item.id))] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
				className: "font-mono",
				children: COMPARE_IDS.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "py-2 pr-3 font-sans font-normal text-muted",
						children: metricLabel(id)
					}), items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "py-2 pr-3",
						children: formatMetric(id, readMetric(item, id, ctx))
					}, item.id))]
				}, id))
			})]
		})
	});
}
var SplitComponent = Desk;
//#endregion
export { SplitComponent as component };
